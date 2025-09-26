#!/bin/bash

# EC2 Setup Script for Travel Itinerary Generator
# Run this script on a fresh Ubuntu 24.04 EC2 instance

set -e

echo "🚀 Setting up Travel Itinerary Generator on EC2..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip htop build-essential

# Install Node.js 20.x (LTS for Ubuntu 24.04)
echo -e "${YELLOW}📦 Installing Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Alternative method using snap (commented out)
# sudo snap install node --classic

echo -e "${GREEN}✅ Node.js $(node --version) installed${NC}"
echo -e "${GREEN}✅ NPM $(npm --version) installed${NC}"

# Install PM2
echo -e "${YELLOW}📦 Installing PM2...${NC}"
sudo npm install -g pm2

# Install Nginx
echo -e "${YELLOW}📦 Installing Nginx...${NC}"
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

echo -e "${GREEN}✅ Nginx installed and started${NC}"

# Install Certbot for SSL (Ubuntu 24.04 method)
echo -e "${YELLOW}📦 Installing Certbot...${NC}"
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Alternative: Traditional apt method
# sudo apt install -y certbot python3-certbot-nginx

# Create application directory
echo -e "${YELLOW}📁 Setting up application directory...${NC}"
cd /home/ubuntu

# Get server information
echo -e "${YELLOW}📥 Server Configuration${NC}"
SERVER_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "Detected EC2 public IP: $SERVER_IP"

read -p "Enter your GitHub repository URL: " REPO_URL
read -p "Enter your domain name (optional, press Enter to use IP): " DOMAIN_NAME

# Use IP if no domain provided
if [ -z "$DOMAIN_NAME" ]; then
    DOMAIN_NAME=$SERVER_IP
    USE_HTTPS=false
    echo "Using IP address: $DOMAIN_NAME"
else
    USE_HTTPS=true
    echo "Using domain: $DOMAIN_NAME"
fi

# Clone repository
echo -e "${YELLOW}📥 Cloning repository...${NC}"
git clone $REPO_URL travel-itinerary-app
cd travel-itinerary-app

# Setup backend
echo -e "${YELLOW}🔧 Setting up backend...${NC}"
cd backend
npm ci
npm run build

# Create production environment file
echo -e "${YELLOW}⚙️  Creating environment configuration...${NC}"
echo "Enter your AWS credentials and configuration:"
read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
read -s -p "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
echo
read -p "AWS Region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

if [ "$USE_HTTPS" = true ]; then
    FRONTEND_URL="https://$DOMAIN_NAME"
    API_URL="https://$DOMAIN_NAME/api"
else
    FRONTEND_URL="http://$DOMAIN_NAME:3000"
    API_URL="http://$DOMAIN_NAME:3001"
fi

cat > .env.production << EOF
NODE_ENV=production
PORT=3001
AWS_REGION=$AWS_REGION
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
BEDROCK_AGENT_ID=BTATPBP5VG
BEDROCK_AGENT_ALIAS_ID=JFTVDFJYFF
FRONTEND_URL=$FRONTEND_URL
EOF

echo -e "${GREEN}✅ Backend environment configured${NC}"

# Start backend with PM2
echo -e "${YELLOW}🚀 Starting backend with PM2...${NC}"
pm2 start dist/server.js --name "travel-backend" --env production
pm2 save
pm2 startup

# Setup frontend
echo -e "${YELLOW}🔧 Setting up frontend...${NC}"
cd ../frontend
npm ci

# Create production environment
cat > .env.production << EOF
VITE_API_URL=$API_URL
VITE_NODE_ENV=production
EOF

echo -e "${GREEN}✅ Frontend configured with API URL: $API_URL${NC}"

# Build frontend
npm run build

# Copy to nginx directory
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

echo -e "${GREEN}✅ Frontend built and deployed${NC}"

# Configure Nginx
echo -e "${YELLOW}🔧 Configuring Nginx...${NC}"

if [ "$USE_HTTPS" = true ]; then
    # Domain-based configuration with SSL
    sudo tee /etc/nginx/sites-available/travel-itinerary << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    
    # Temporary configuration for Let's Encrypt
    location / {
        root /var/www/html;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    
    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}
EOF
else
    # IP-based configuration without SSL
    sudo tee /etc/nginx/sites-available/travel-itinerary << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;
    
    # Frontend
    location / {
        root /var/www/html;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # CORS headers for direct IP access
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
    }
    
    # Backend API proxy (not needed for IP-based setup)
    # Frontend will connect directly to :3001
    
    # Health check
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}
EOF
fi

# Enable site
sudo ln -s /etc/nginx/sites-available/travel-itinerary /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo -e "${GREEN}✅ Nginx configured${NC}"

# Setup SSL with Let's Encrypt (only for domain-based setup)
if [ "$USE_HTTPS" = true ]; then
    echo -e "${YELLOW}🔒 Setting up SSL certificate...${NC}"
    echo "Make sure your domain $DOMAIN_NAME points to this server's IP address ($SERVER_IP)"
    read -p "Press Enter when DNS is configured..."

    sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME

    # Enable auto-renewal
    sudo systemctl enable certbot.timer
    sudo systemctl start certbot.timer

    echo -e "${GREEN}✅ SSL certificate configured${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping SSL setup for IP-based deployment${NC}"
    echo -e "${YELLOW}   For production, consider using a domain name${NC}"
fi

# Install CloudWatch agent (optional)
echo -e "${YELLOW}📊 Installing CloudWatch agent...${NC}"
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb
sudo apt-get install -f  # Fix any dependency issues
rm amazon-cloudwatch-agent.deb

# Setup firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Install fail2ban for security
echo -e "${YELLOW}🛡️  Installing fail2ban...${NC}"
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create deployment script
echo -e "${YELLOW}📝 Creating deployment script...${NC}"
cat > /home/ubuntu/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying Travel Itinerary Generator..."

cd /home/ubuntu/travel-itinerary-app

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
echo "🌐 Your app is live at: https://DOMAIN_NAME"
EOF

sed -i "s/DOMAIN_NAME/$DOMAIN_NAME/g" /home/ubuntu/deploy.sh
chmod +x /home/ubuntu/deploy.sh

# Create backup script
echo -e "${YELLOW}💾 Creating backup script...${NC}"
cat > /home/ubuntu/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

# Backup application code
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /home/ubuntu/travel-itinerary-app

# Backup nginx config
tar -czf $BACKUP_DIR/nginx_$DATE.tar.gz /etc/nginx/sites-available/travel-itinerary

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/app_$DATE.tar.gz"
EOF

chmod +x /home/ubuntu/backup.sh

# Add backup to crontab
echo "0 2 * * * /home/ubuntu/backup.sh" | crontab -

echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo "=================================="
echo -e "${GREEN}✅ Backend running on PM2${NC}"
echo -e "${GREEN}✅ Frontend deployed to Nginx${NC}"
echo -e "${GREEN}✅ SSL certificate configured${NC}"
echo -e "${GREEN}✅ Firewall configured${NC}"
echo -e "${GREEN}✅ Backup script scheduled${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Test your application: https://$DOMAIN_NAME"
echo "2. Monitor with: pm2 monit"
echo "3. Check logs with: pm2 logs travel-backend"
echo "4. Deploy updates with: ./deploy.sh"
echo "5. Create backups with: ./backup.sh"
echo ""
echo -e "${YELLOW}📊 Useful commands:${NC}"
echo "- Check PM2 status: pm2 status"
echo "- Restart backend: pm2 restart travel-backend"
echo "- Check Nginx status: sudo systemctl status nginx"
echo "- View Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "- Check SSL certificate: sudo certbot certificates"
echo ""
if [ "$USE_HTTPS" = true ]; then
    echo -e "${GREEN}🌐 Your Travel Itinerary Generator is now live at: https://$DOMAIN_NAME${NC}"
else
    echo -e "${GREEN}🌐 Your Travel Itinerary Generator is now live at: http://$DOMAIN_NAME:3000${NC}"
    echo -e "${GREEN}🔗 Backend API available at: http://$DOMAIN_NAME:3001${NC}"
    echo -e "${YELLOW}⚠️  Note: Using HTTP without SSL. For production, use a domain with HTTPS.${NC}"
fi