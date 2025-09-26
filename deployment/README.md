# Deployment Guide

## Prerequisites

### Environment Variables
Create these environment variables in your deployment platform:

**Backend:**
```
NODE_ENV=production
PORT=3001
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_AGENT_ID=BTATPBP5VG
BEDROCK_AGENT_ALIAS_ID=JFTVDFJYFF
FRONTEND_URL=https://your-frontend-domain.com
```

**Frontend:**
```
VITE_API_URL=https://your-backend-domain.com
VITE_NODE_ENV=production
```

## Quick Deploy Options

### 1. Vercel + Railway (Recommended for MVP)

#### Frontend (Vercel):
1. Connect GitHub repo to Vercel
2. Set build command: `cd frontend && npm run build`
3. Set output directory: `frontend/dist`
4. Add environment variables

#### Backend (Railway):
1. Connect GitHub repo to Railway
2. Set start command: `cd backend && npm start`
3. Add environment variables
4. Deploy

### 2. AWS Amplify (Full AWS Integration)

```bash
# Install and configure
npm install -g @aws-amplify/cli
amplify configure

# Initialize project
amplify init
amplify add hosting
amplify add api

# Deploy
amplify publish
```

### 3. Docker Deployment

```bash
# Build and run locally
docker-compose up --build

# Deploy to cloud
# - Push to Docker Hub
# - Deploy to DigitalOcean App Platform
# - Or use with Kubernetes
```

## Production Considerations

### Security
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS for production domains
- [ ] Secure AWS credentials (use IAM roles)
- [ ] Add rate limiting
- [ ] Enable request logging

### Performance
- [ ] Enable gzip compression
- [ ] Add CDN for static assets
- [ ] Configure caching headers
- [ ] Monitor response times

### Monitoring
- [ ] Set up health checks
- [ ] Configure error tracking (Sentry)
- [ ] Add performance monitoring
- [ ] Set up alerts

### Scaling
- [ ] Configure auto-scaling
- [ ] Add load balancing
- [ ] Consider database for session storage
- [ ] Implement caching layer