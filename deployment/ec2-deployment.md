# AWS EC2 Deployment Guide

## Overview
Deploy your Travel Itinerary Generator on AWS EC2 with:
- **Frontend**: Nginx serving built React app
- **Backend**: Node.js API with PM2 process manager
- **SSL**: Let's Encrypt certificates
- **Domain**: Custom domain with Route 53
- **Monitoring**: CloudWatch integration

## Prerequisites

### 1. AWS Account Setup
- AWS Account with EC2 access
- AWS CLI configured locally
- Key pair for EC2 access

### 2. Domain (Optional but Recommended)
- Domain name (e.g., `travel-planner.com`)
- Access to DNS management

## Step 1: Launch EC2 Instance

### 1.1 Create EC2 Instance
```bash
# Launch Ubuntu 24.04 LTS instance
aws ec2 run-instances \
  --image-id ami-0e86e20dae90b2c6a \
  --instance-type t3.small \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=travel-itinerary-server}]'
```

### 1.2 Configure Security Group
Allow these ports:
- **22** (SSH) - Your IP only
- **80** (HTTP) - 0.0.0.0/0
- **443** (HTTPS) - 0.0.0.0/0
- **3001** (API) - 0.0.0.0/0 (temporary, will be proxied)

### 1.3 Allocate Elastic IP
```bash
# Allocate and associate Elastic IP
aws ec2 allocate-address --domain vpc
aws ec2 associate-address --instance-id i-xxxxxxxxx --allocation-id eipalloc-xxxxxxxxx
```

## Step 2: Server Setup

### 2.1 Connect to Instance
```bash
ssh -i your-key.pem ubuntu@your-elastic-ip
```

### 2.2 Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip build-essential
```

### 2.3 Install Node.js
```bash
# Install Node.js 20.x (LTS for Ubuntu 24.04)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version

# Alternative: Install via snap (Ubuntu 24.04 preferred method)
# sudo snap install node --classic
```

### 2.4 Install PM2
```bash
sudo npm install -g pm2
```

### 2.5 Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

## Step 3: Deploy Application

### 3.1 Clone Repository
```bash
cd /home/ubuntu
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

### 3.2 Setup Backend
```bash
cd backend

# Install dependencies
npm ci

# Build TypeScript
npm run build

# Create production environment file
sudo tee .env.production << EOF
NODE_ENV=production
PORT=3001
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_AGENT_ID=BTATPBP5VG
BEDROCK_AGENT_ALIAS_ID=JFTVDFJYFF
GOOGLE_PLACES_API_KEY=your_google_places_api_key
FRONTEND_URL=https://your-domain.com
EOF

# Start with PM2
pm2 start dist/server.js --name "travel-backend" --env production
pm2 save
pm2 startup
```

### 3.3 Setup Frontend
```bash
cd ../frontend

# Install dependencies
npm ci

# Create production environment
echo "VITE_API_URL=https://your-domain.com/api" > .env.production
echo "VITE_NODE_ENV=production" >> .env.production

# Build for production
npm run build

# Copy built files to nginx directory
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
```

## Step 4: Configure Nginx

### 4.1 Create Nginx Configuration
```bash
sudo tee /etc/nginx/sites-available/travel-itinerary << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL certificates (will be configured with Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Frontend (React app)
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}
EOF
```

### 4.2 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/travel-itinerary /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
```

## Step 5: SSL Certificate with Let's Encrypt

### 5.1 Install Certbot
```bash
# Ubuntu 24.04 uses snapd for certbot installation
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot

# Create symlink for system-wide access
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Alternative: Traditional apt method (still works)
# sudo apt install -y certbot python3-certbot-nginx
```

### 5.2 Obtain SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 5.3 Auto-renewal
```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Step 6: Configure Domain (Route 53)

### 6.1 Create Hosted Zone
```bash
aws route53 create-hosted-zone --name your-domain.com --caller-reference $(date +%s)
```

### 6.2 Create DNS Records
```bash
# A record pointing to your Elastic IP
aws route53 change-resource-record-sets --hosted-zone-id Z1234567890 --change-batch '{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "your-domain.com",
      "Type": "A",
      "TTL": 300,
      "ResourceRecords": [{"Value": "your-elastic-ip"}]
    }
  }]
}'

# CNAME for www
aws route53 change-resource-record-sets --hosted-zone-id Z1234567890 --change-batch '{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "www.your-domain.com",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "your-domain.com"}]
    }
  }]
}'
```

## Step 7: Monitoring and Logging

### 7.1 Install CloudWatch Agent
```bash
# Download and install CloudWatch agent for Ubuntu 24.04
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Fix any dependency issues if they occur
sudo apt-get install -f

# Alternative: Install via snap
# sudo snap install amazon-cloudwatch-agent
```

### 7.2 Configure CloudWatch Agent
```bash
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
  "metrics": {
    "namespace": "TravelItinerary/EC2",
    "metrics_collected": {
      "cpu": {
        "measurement": ["cpu_usage_idle", "cpu_usage_iowait", "cpu_usage_user", "cpu_usage_system"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": ["used_percent"],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/nginx/access.log",
            "log_group_name": "travel-itinerary-nginx-access",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "travel-itinerary-nginx-error",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/home/ubuntu/.pm2/logs/travel-backend-out.log",
            "log_group_name": "travel-itinerary-backend",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
EOF

sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s
```

### 7.3 Setup Log Rotation
```bash
sudo tee /etc/logrotate.d/travel-itinerary << 'EOF'
/home/ubuntu/.pm2/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 0644 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

## Step 8: Backup and Security

### 8.1 Create AMI Backup
```bash
aws ec2 create-image --instance-id i-xxxxxxxxx --name "travel-itinerary-backup-$(date +%Y%m%d)" --description "Travel Itinerary Generator backup"
```

### 8.2 Setup Automated Backups
```bash
# Create backup script
sudo tee /home/ubuntu/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

# Backup application code
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /home/ubuntu/your-repo

# Backup nginx config
tar -czf $BACKUP_DIR/nginx_$DATE.tar.gz /etc/nginx/sites-available/travel-itinerary

# Upload to S3 (optional)
# aws s3 cp $BACKUP_DIR/ s3://your-backup-bucket/ --recursive

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup.sh

# Add to crontab
echo "0 2 * * * /home/ubuntu/backup.sh" | crontab -
```

### 8.3 Security Hardening
```bash
# Update security group to restrict SSH access
aws ec2 authorize-security-group-ingress --group-id sg-xxxxxxxxx --protocol tcp --port 22 --cidr your-ip/32

# Install fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## Step 9: Deployment Script

Create an automated deployment script:

```bash
#!/bin/bash
# deploy.sh - Automated deployment script

set -e

echo "🚀 Deploying Travel Itinerary Generator to EC2..."

# Pull latest code
git pull origin main

# Update backend
cd backend
npm ci
npm run build
pm2 restart travel-backend

# Update frontend
cd ../frontend
npm ci
npm run build
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Deployment completed successfully!"
echo "🌐 Your app is live at: https://your-domain.com"
```

## Step 10: Testing and Verification

### 10.1 Health Checks
```bash
# Test backend health
curl https://your-domain.com/health

# Test API endpoint
curl -X POST https://your-domain.com/api/verify-city \
  -H "Content-Type: application/json" \
  -d '{"city": "Tokyo"}'

# Test frontend
curl -I https://your-domain.com
```

### 10.2 Performance Testing
```bash
# Install Apache Bench
sudo apt install -y apache2-utils

# Test API performance
ab -n 100 -c 10 https://your-domain.com/health

# Test frontend performance
ab -n 100 -c 10 https://your-domain.com/
```

## Estimated Costs

### Monthly Costs (us-east-1):
- **EC2 t3.small**: ~$15/month
- **Elastic IP**: ~$3.65/month (if not attached to running instance)
- **Data Transfer**: ~$1-5/month (depending on traffic)
- **Route 53**: ~$0.50/month per hosted zone
- **CloudWatch**: ~$1-3/month (depending on logs)

**Total**: ~$20-30/month

## Scaling Options

### Vertical Scaling
- Upgrade to t3.medium or t3.large
- Add more storage if needed

### Horizontal Scaling
- Application Load Balancer + Auto Scaling Group
- Multiple EC2 instances
- RDS for shared session storage

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if backend is running: `pm2 status`
   - Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`

2. **SSL Certificate Issues**
   - Renew certificate: `sudo certbot renew`
   - Check certificate status: `sudo certbot certificates`

3. **High Memory Usage**
   - Monitor with: `htop` or `pm2 monit`
   - Restart backend: `pm2 restart travel-backend`

4. **Bedrock Access Issues**
   - Check IAM permissions
   - Verify AWS credentials in environment

## Maintenance Tasks

### Daily
- Monitor CloudWatch metrics
- Check application logs

### Weekly
- Review security logs
- Update system packages: `sudo apt update && sudo apt upgrade`

### Monthly
- Create AMI backup
- Review and rotate logs
- Update SSL certificates (automatic with Let's Encrypt)

Your Travel Itinerary Generator is now deployed on EC2 with production-grade configuration! 🎉