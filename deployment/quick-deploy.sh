#!/bin/bash

echo "🚀 AWS Amplify + App Runner Quick Deploy Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

# Check if AWS is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not configured. Run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configured${NC}"

# Check Amplify CLI
if ! command -v amplify &> /dev/null; then
    echo -e "${YELLOW}Installing Amplify CLI...${NC}"
    npm install -g @aws-amplify/cli
fi

echo -e "${GREEN}✅ Amplify CLI ready${NC}"

# Get AWS account info
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)
echo -e "${GREEN}AWS Account: ${AWS_ACCOUNT}${NC}"
echo -e "${GREEN}AWS Region: ${AWS_REGION}${NC}"

echo ""
echo -e "${YELLOW}📋 Deployment Steps:${NC}"
echo "1. Deploy Backend with App Runner"
echo "2. Deploy Frontend with Amplify"
echo "3. Configure environment variables"
echo ""

read -p "Continue with deployment? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 1: Backend Deployment Instructions${NC}"
echo "======================================="
echo "1. Go to AWS App Runner Console:"
echo "   https://console.aws.amazon.com/apprunner/"
echo ""
echo "2. Click 'Create service'"
echo "3. Choose 'Source code repository'"
echo "4. Connect your GitHub repository"
echo "5. Select branch: main"
echo "6. Use configuration file: apprunner.yaml"
echo "7. Service name: travel-itinerary-backend"
echo "8. Add environment variables:"
echo "   NODE_ENV=production"
echo "   PORT=3001"
echo "   AWS_REGION=${AWS_REGION}"
echo "   BEDROCK_AGENT_ID=BTATPBP5VG"
echo "   BEDROCK_AGENT_ALIAS_ID=JFTVDFJYFF"
echo ""

read -p "Press Enter when App Runner deployment is complete..."

echo ""
echo -e "${YELLOW}Enter your App Runner service URL:${NC}"
read -p "URL (e.g., https://abc123.us-east-1.awsapprunner.com): " BACKEND_URL

echo ""
echo -e "${YELLOW}Step 2: Frontend Deployment${NC}"
echo "=========================="

# Initialize Amplify if not already done
if [ ! -f "amplify/.config/project-config.json" ]; then
    echo "Initializing Amplify project..."
    amplify init --yes
fi

# Add hosting if not already added
if [ ! -d "amplify/backend/hosting" ]; then
    echo "Adding Amplify hosting..."
    amplify add hosting --yes
fi

echo ""
echo -e "${YELLOW}Go to AWS Amplify Console:${NC}"
echo "https://console.aws.amazon.com/amplify/"
echo ""
echo "1. Click 'Create new app' → 'Host web app'"
echo "2. Connect your GitHub repository"
echo "3. Select branch: main"
echo "4. App name: travel-itinerary-generator"
echo "5. Build settings: Use amplify.yml"
echo "6. Add environment variable:"
echo "   VITE_API_URL=${BACKEND_URL}"
echo "   VITE_NODE_ENV=production"
echo ""

read -p "Press Enter when Amplify deployment is complete..."

echo ""
echo -e "${YELLOW}Enter your Amplify app URL:${NC}"
read -p "URL (e.g., https://main.abc123.amplifyapp.com): " FRONTEND_URL

echo ""
echo -e "${YELLOW}Step 3: Update Backend CORS${NC}"
echo "=========================="
echo "Go back to App Runner Console and update environment variables:"
echo "Add: FRONTEND_URL=${FRONTEND_URL}"
echo ""

read -p "Press Enter when CORS is updated..."

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "======================="
echo -e "${GREEN}Frontend URL: ${FRONTEND_URL}${NC}"
echo -e "${GREEN}Backend URL: ${BACKEND_URL}${NC}"
echo ""
echo -e "${YELLOW}Testing your deployment:${NC}"
echo "curl ${BACKEND_URL}/health"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test the application end-to-end"
echo "2. Set up custom domain (optional)"
echo "3. Configure monitoring and alerts"
echo "4. Set up staging environment"
echo ""
echo -e "${GREEN}Your Travel Itinerary Generator is now live! 🚀${NC}"