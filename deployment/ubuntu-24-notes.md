# Ubuntu 24.04 LTS Compatibility Notes

## Key Changes from Ubuntu 22.04

### 1. Node.js Version
- **Recommended**: Node.js 20.x LTS (instead of 18.x)
- **Installation**: NodeSource repository still works
- **Alternative**: Snap package (`sudo snap install node --classic`)

### 2. Certbot Installation
- **Preferred Method**: Snap package (more secure and up-to-date)
- **Command**: `sudo snap install --classic certbot`
- **Legacy Method**: APT package still available but not recommended

### 3. System Dependencies
- **Build Tools**: `build-essential` package required for native modules
- **Python**: Python 3.12 is default (vs 3.10 in Ubuntu 22.04)

### 4. Package Management
- **Snap**: More packages available via snap
- **APT**: Traditional packages still work
- **Flatpak**: Also available as alternative

## Updated Installation Commands

### Node.js Installation (Method 1 - NodeSource)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Node.js Installation (Method 2 - Snap)
```bash
sudo snap install node --classic
```

### Certbot Installation (Recommended)
```bash
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### System Preparation
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip htop build-essential
```

## Compatibility Testing

All components have been tested on Ubuntu 24.04:
- ✅ Node.js 20.x with npm
- ✅ PM2 process manager
- ✅ Nginx web server
- ✅ Let's Encrypt SSL certificates
- ✅ CloudWatch agent
- ✅ UFW firewall
- ✅ fail2ban security

## Performance Improvements

Ubuntu 24.04 includes:
- **Better Memory Management**: Improved for Node.js applications
- **Faster Boot Times**: Systemd optimizations
- **Enhanced Security**: AppArmor improvements
- **Network Stack**: Better TCP performance

## Migration from Ubuntu 22.04

If upgrading from Ubuntu 22.04:

1. **Backup your application**:
   ```bash
   ./backup.sh
   ```

2. **Upgrade system**:
   ```bash
   sudo do-release-upgrade
   ```

3. **Update Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Update Certbot**:
   ```bash
   sudo apt remove certbot python3-certbot-nginx
   sudo snap install --classic certbot
   sudo ln -s /snap/bin/certbot /usr/bin/certbot
   ```

5. **Rebuild application**:
   ```bash
   cd backend && npm ci && npm run build
   pm2 restart travel-backend
   ```

## Troubleshooting Ubuntu 24.04

### Node.js Issues
```bash
# Check Node.js version
node --version  # Should be 20.x

# If using snap and having permission issues
sudo snap connect node:process-control
```

### Certbot Issues
```bash
# If certbot command not found after snap install
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Check certbot version
certbot --version
```

### Build Issues
```bash
# Install build dependencies
sudo apt install -y build-essential python3-dev

# Clear npm cache if needed
npm cache clean --force
```

## Security Enhancements

Ubuntu 24.04 includes enhanced security:
- **AppArmor**: More restrictive profiles
- **Snap Confinement**: Better isolation
- **Kernel Security**: Latest security patches

Make sure to test your application thoroughly after deployment.

## Performance Tuning

For optimal performance on Ubuntu 24.04:

```bash
# Optimize for Node.js applications
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf
echo 'fs.file-max=65536' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# PM2 optimization
pm2 install pm2-server-monit
```

Your Travel Itinerary Generator is fully compatible with Ubuntu 24.04! 🚀