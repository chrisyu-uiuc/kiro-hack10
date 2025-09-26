# AWS Amplify + App Runner Deployment Guide

## Overview
- **Frontend**: AWS Amplify (React app with CDN, SSL, CI/CD)
- **Backend**: AWS App Runner (Node.js API with auto-scaling)
- **Integration**: Perfect for AWS Bedrock Agent usage

## Prerequisites

### 1. AWS Account Setup
- AWS Account with billing enabled
- AWS CLI installed and configured
- GitHub repository with your code

### 2. IAM Permissions
Your AWS user/role needs these permissions:
- `AmplifyFullAccess`
- `AppRunnerFullAccess`
- `BedrockFullAccess` (for your existing Bedrock Agent)
- `IAMFullAccess` (for creating service roles)

## Step 1: Deploy Backend with AWS App Runner

### 1.1 Create App Runner Configuration
Create `apprunner.yaml` in your project root:

```yaml
version: 1.0
runtime: nodejs18
build:
  commands:
    build:
      - echo "Installing backend dependencies..."
      - cd backend
      - npm ci
      - echo "Building backend..."
      - npm run build
      - echo "Build completed"
run:
  runtime-version: 18
  command: cd backend && node dist/server.js
  network:
    port: 3001
    env: PORT
  env:
    - name: NODE_ENV
      value: production
    - name: PORT
      value: 3001
```

### 1.2 Deploy via AWS Console

1. **Go to AWS App Runner Console**
   - Navigate to https://console.aws.amazon.com/apprunner/

2. **Create Service**
   - Click "Create service"
   - Choose "Source code repository"

3. **Connect Repository**
   - Choose "GitHub"
   - Connect your GitHub account
   - Select your repository
   - Choose branch: `main`
   - Choose "Automatic" deployment trigger

4. **Configure Build**
   - Build command: Use configuration file
   - Configuration file: `apprunner.yaml`

5. **Configure Service**
   - Service name: `travel-itinerary-backend`
   - Virtual CPU: 0.25 vCPU
   - Virtual memory: 0.5 GB
   - Auto scaling: Min 1, Max 10 instances

6. **Environment Variables**
   Add these environment variables:
   ```
   NODE_ENV=production
   PORT=3001
   AWS_REGION=us-east-1
   BEDROCK_AGENT_ID=BTATPBP5VG
   BEDROCK_AGENT_ALIAS_ID=JFTVDFJYFF
   FRONTEND_URL=https://your-amplify-domain.amplifyapp.com
   ```

7. **Create Service**
   - Review and create
   - Wait for deployment (5-10 minutes)
   - Note the service URL (e.g., `https://abc123.us-east-1.awsapprunner.com`)

### 1.3 Configure IAM Role for Bedrock Access

1. **Go to IAM Console**
2. **Find App Runner Service Role**
   - Look for role like `AppRunnerInstanceRole-travel-itinerary-backend`
3. **Attach Bedrock Policy**
   - Attach `AmazonBedrockFullAccess` policy
   - Or create custom policy with minimal permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeAgent"
            ],
            "Resource": "arn:aws:bedrock:us-east-1:*:agent/BTATPBP5VG"
        }
    ]
}
```

## Step 2: Deploy Frontend with AWS Amplify

### 2.1 Install Amplify CLI
```bash
npm install -g @aws-amplify/cli
amplify configure
```

### 2.2 Initialize Amplify Project
```bash
# In your project root
amplify init

# Follow prompts:
# Project name: travel-itinerary-generator
# Environment: prod
# Default editor: Visual Studio Code
# App type: javascript
# Framework: react
# Source directory: frontend/src
# Distribution directory: frontend/dist
# Build command: npm run build
# Start command: npm run dev
```

### 2.3 Add Hosting
```bash
amplify add hosting

# Choose:
# Select the plugin module: Amazon CloudFront and S3
# Select the environment setup: PROD (S3 with CloudFront using HTTPS)
# hosting bucket name: (accept default)
```

### 2.4 Configure Build Settings
Create `amplify.yml` in project root:

```yaml
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - cd frontend
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: frontend/dist
        files:
          - '**/*'
      cache:
        paths:
          - frontend/node_modules/**/*
    appRoot: frontend
```

### 2.5 Deploy via Amplify Console

1. **Go to AWS Amplify Console**
   - Navigate to https://console.aws.amazon.com/amplify/

2. **Create New App**
   - Choose "Host web app"
   - Connect GitHub repository
   - Select your repository and `main` branch

3. **Configure Build Settings**
   - App name: `travel-itinerary-generator`
   - Build and test settings: Use `amplify.yml`
   - Advanced settings:
     - Add environment variables:
       ```
       VITE_API_URL=https://your-apprunner-url.us-east-1.awsapprunner.com
       VITE_NODE_ENV=production
       ```

4. **Deploy**
   - Review and save
   - Wait for deployment (5-10 minutes)
   - Note the Amplify URL (e.g., `https://main.abc123.amplifyapp.com`)

### 2.6 Update Backend CORS
Update your App Runner environment variables:
```
FRONTEND_URL=https://main.abc123.amplifyapp.com
```

## Step 3: Configure Custom Domain (Optional)

### 3.1 For Amplify (Frontend)
1. In Amplify Console → Domain management
2. Add domain → Custom domain
3. Enter your domain (e.g., `travel-planner.com`)
4. Configure DNS records as shown

### 3.2 For App Runner (Backend)
1. In App Runner Console → Custom domains
2. Add custom domain (e.g., `api.travel-planner.com`)
3. Configure DNS records as shown

## Step 4: Monitoring and Maintenance

### 4.1 CloudWatch Monitoring
- App Runner automatically creates CloudWatch logs
- Amplify provides build and access logs
- Set up CloudWatch alarms for errors

### 4.2 Cost Optimization
- App Runner: Pay per use (scales to zero)
- Amplify: Free tier includes 1000 build minutes/month
- Estimated cost: $10-50/month depending on traffic

## Step 5: Testing Deployment

### 5.1 Health Checks
```bash
# Test backend health
curl https://your-apprunner-url.us-east-1.awsapprunner.com/health

# Test frontend
curl https://main.abc123.amplifyapp.com
```

### 5.2 End-to-End Test
1. Visit your Amplify URL
2. Test city verification
3. Test spot generation
4. Test itinerary creation with realistic timing

## Troubleshooting

### Common Issues

1. **Bedrock Access Denied**
   - Check IAM role has Bedrock permissions
   - Verify AWS region is us-east-1

2. **CORS Errors**
   - Update FRONTEND_URL in App Runner
   - Redeploy App Runner service

3. **Build Failures**
   - Check build logs in Amplify Console
   - Verify Node.js version compatibility

4. **App Runner Health Check Fails**
   - Ensure /health endpoint returns 200
   - Check CloudWatch logs for errors

## Security Best Practices

1. **Environment Variables**
   - Never commit AWS credentials to Git
   - Use App Runner environment variables
   - Rotate credentials regularly

2. **CORS Configuration**
   - Only allow your frontend domain
   - Don't use wildcard (*) in production

3. **HTTPS Only**
   - Both Amplify and App Runner provide HTTPS by default
   - Redirect HTTP to HTTPS

## Scaling Considerations

- **App Runner**: Auto-scales based on traffic (1-10 instances)
- **Amplify**: CDN handles global traffic automatically
- **Bedrock**: Managed service, scales automatically
- **Cost**: Scales with usage, no fixed costs

## Next Steps After Deployment

1. Set up monitoring alerts
2. Configure backup strategies
3. Implement CI/CD improvements
4. Add performance monitoring
5. Set up staging environment