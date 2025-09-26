#!/bin/bash

# Quick fix for CORS issues on EC2 deployment
# Run this script on your EC2 instance if you're getting CORS errors

echo "🔧 Fixing CORS configuration for EC2 deployment..."

# Get the current public IP
SERVER_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo "Detected EC2 public IP: $SERVER_IP"

# Update frontend environment to use correct API URL
cd /home/ubuntu/travel-itinerary-app/frontend

echo "📝 Updating frontend API configuration..."
cat > .env.production << EOF
VITE_API_URL=http://$SERVER_IP:3001
VITE_NODE_ENV=production
EOF

# Rebuild frontend
echo "🔨 Rebuilding frontend..."
npm run build

# Copy to nginx
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html

# Update backend CORS configuration
cd ../backend

echo "🔧 Updating backend CORS configuration..."
# Add the current IP to the allowed origins in the environment
cat >> .env.production << EOF

# EC2 specific CORS configuration
FRONTEND_URL=http://$SERVER_IP:3000
EOF

# Restart backend
echo "🔄 Restarting backend..."
pm2 restart travel-backend

# Update nginx configuration for direct API access
echo "🌐 Updating Nginx configuration..."
sudo tee /etc/nginx/sites-available/travel-itinerary << EOF
server {
    listen 80;
    server_name $SERVER_IP;
    
    # Frontend
    location / {
        root /var/www/html;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    
    # Health check
    location /health {
        return 200 "Frontend healthy";
        add_header Content-Type text/plain;
    }
}

# Separate server block for API on port 3001
server {
    listen 3001;
    server_name $SERVER_IP;
    
    # CORS headers
    add_header Access-Control-Allow-Origin "http://$SERVER_IP:3000" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Session-ID" always;
    add_header Access-Control-Allow-Credentials "true" always;
    
    # Handle preflight requests
    if (\$request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "http://$SERVER_IP:3000" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Session-ID" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Max-Age 1728000;
        add_header Content-Type "text/plain charset=UTF-8";
        add_header Content-Length 0;
        return 204;
    }
    
    # Proxy to backend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Test and reload nginx
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "✅ CORS configuration fixed!"
echo "🌐 Frontend: http://$SERVER_IP:3000"
echo "🔗 Backend API: http://$SERVER_IP:3001"
echo ""
echo "🧪 Test your application:"
echo "curl http://$SERVER_IP:3001/health"
echo ""
echo "If you still have issues, check:"
echo "1. Security group allows ports 3000 and 3001"
echo "2. Backend is running: pm2 status"
echo "3. Frontend is built with correct API URL"