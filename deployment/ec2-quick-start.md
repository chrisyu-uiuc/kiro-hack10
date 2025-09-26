# EC2 Quick Start Guide

## 🚀 Deploy in 15 Minutes

### Step 1: Launch EC2 Instance
1. **Go to AWS EC2 Console**
2. **Launch Instance**:
   - AMI: Ubuntu Server 24.04 LTS
   - Instance Type: t3.small (or t3.micro for testing)
   - Key Pair: Create or select existing
   - Security Group: Allow SSH (22), HTTP (80), HTTPS (443)
3. **Launch and note the public IP**

### Step 2: Connect and Run Setup
```bash
# Connect to your instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Download and run setup script
wget https://raw.githubusercontent.com/your-username/your-repo/main/deployment/ec2-setup.sh
chmod +x ec2-setup.sh
./ec2-setup.sh
```

### Step 3: Configure DNS (Optional)
If you have a domain:
1. Point your domain A record to your EC2 Elastic IP
2. Wait for DNS propagation (5-30 minutes)

### Step 4: Test Your Application
- **Without Domain**: `http://your-ec2-ip`
- **With Domain**: `https://your-domain.com`

## 💰 Cost Estimate
- **t3.small**: ~$15/month
- **Elastic IP**: ~$3.65/month (if not attached)
- **Data Transfer**: ~$1-5/month
- **Total**: ~$20-25/month

## 🔧 Management Commands

### Backend Management
```bash
pm2 status              # Check backend status
pm2 restart travel-backend  # Restart backend
pm2 logs travel-backend     # View backend logs
pm2 monit               # Real-time monitoring
```

### Frontend Updates
```bash
cd /home/ubuntu/travel-itinerary-app/frontend
npm run build
sudo cp -r dist/* /var/www/html/
sudo systemctl reload nginx
```

### SSL Certificate
```bash
sudo certbot certificates    # Check certificate status
sudo certbot renew         # Renew certificates
```

### Deployment
```bash
./deploy.sh    # Deploy latest changes from GitHub
```

### Backup
```bash
./backup.sh    # Create backup
```

## 🔍 Troubleshooting

### Backend Issues
```bash
# Check if backend is running
pm2 status

# View backend logs
pm2 logs travel-backend

# Restart backend
pm2 restart travel-backend
```

### Frontend Issues
```bash
# Check nginx status
sudo systemctl status nginx

# View nginx logs
sudo tail -f /var/log/nginx/error.log

# Test nginx configuration
sudo nginx -t
```

### SSL Issues
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run
```

## 📊 Monitoring

### System Resources
```bash
htop           # CPU and memory usage
df -h          # Disk usage
pm2 monit      # Application monitoring
```

### Logs
```bash
# Backend logs
pm2 logs travel-backend

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

## 🔒 Security Best Practices

1. **Keep system updated**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Monitor failed login attempts**:
   ```bash
   sudo tail -f /var/log/auth.log
   ```

3. **Check firewall status**:
   ```bash
   sudo ufw status
   ```

4. **Regular backups**:
   ```bash
   ./backup.sh
   ```

## 🚀 Scaling Options

### Vertical Scaling (Upgrade Instance)
1. Stop instance
2. Change instance type to t3.medium or t3.large
3. Start instance

### Horizontal Scaling (Multiple Instances)
1. Create Application Load Balancer
2. Launch multiple EC2 instances
3. Use shared database for sessions

Your Travel Itinerary Generator is now running on EC2! 🎉