# Travel Itinerary Generator - Setup Guide

This guide will help you set up and run the Travel Itinerary Generator application.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- AWS account with Bedrock Agent access

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Configure AWS credentials:**
   
   Create `backend/.env` from the example:
   ```bash
   cd backend
   cp .env.example .env
   ```
   
   Edit `backend/.env` with your AWS configuration:
   ```bash
   # AWS Configuration
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here

   # Bedrock Agent Configuration
   BEDROCK_AGENT_ID=BTATPBP5VG
   BEDROCK_AGENT_ALIAS_ID=JFTVDFJYFF

   # Server Configuration
   PORT=3001
   NODE_ENV=development

   # CORS Configuration
   FRONTEND_URL=http://localhost:3000
   ```

3. **Start the application:**
   ```bash
   npm run dev
   ```
   
   This will start:
   - Backend API server on http://localhost:3001
   - Frontend React app on http://localhost:3000

## Manual Setup (Alternative)

If you prefer to start services separately:

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Server Management Scripts

For easier server management, use the provided scripts:

```bash
# Restart both servers (kills existing processes and starts fresh)
./restart-servers.sh

# Stop all servers
./stop-servers.sh
```

These scripts automatically:
- Kill any processes running on ports 3000 and 3001
- Build the backend TypeScript code
- Start backend and test health endpoint
- Start frontend development server
- Provide network access information

## Testing

Run backend tests:
```bash
cd backend
npm test
```

Run type checking:
```bash
npm run type-check
```

## Build for Production

Build both applications:
```bash
npm run build
```

Or build separately:
```bash
cd backend && npm run build
cd frontend && npm run build
```

## Application Flow

1. **City Input**: Enter a city name (e.g., "Paris", "Tokyo", "New York")
2. **City Verification**: The system verifies the city exists using AWS Bedrock Agent
3. **Spot Generation**: Get 10-20 recommended spots for your city
4. **Spot Selection**: Choose the places you want to visit
5. **Itinerary Generation**: Get a personalized travel itinerary with timing and transportation

## AWS Bedrock Agent Configuration

The application is configured to use:
- **Region**: us-east-1
- **Agent ID**: BTATPBP5VG
- **Agent Alias ID**: JFTVDFJYFF

Make sure your AWS credentials have the necessary permissions:
- `bedrock:InvokeAgent`
- Access to the specified Bedrock Agent

## Troubleshooting

### Common Issues

1. **Port already in use**:
   - Use `./stop-servers.sh` to kill existing processes
   - Backend (3001): Change `PORT` in `backend/.env`
   - Frontend (3000): Change port in `frontend/vite.config.ts`

2. **AWS credentials not found**:
   - Ensure `backend/.env` has correct AWS credentials
   - Check AWS CLI configuration: `aws configure list`

3. **CORS errors**:
   - The backend includes flexible CORS configuration for development
   - For EC2 deployment issues, run `deployment/fix-cors-ec2.sh`
   - Ensure `FRONTEND_URL` in `backend/.env` matches your frontend URL

4. **Build errors**:
   - Run `npm run type-check` to identify TypeScript issues
   - Ensure all dependencies are installed: `npm run install:all`
   - Use `./restart-servers.sh` for a clean restart with build

### Development Tips

- Use browser dev tools to monitor API calls
- Check backend logs for AWS Bedrock Agent responses
- The application includes comprehensive error handling and loading states

## Project Structure

```
travel-itinerary-generator/
├── backend/                  # Node.js/Express API server
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # AWS Bedrock integration
│   │   ├── middleware/      # Express middleware
│   │   └── __tests__/       # Unit tests
│   └── package.json
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API client
│   │   ├── hooks/           # Custom hooks
│   │   └── types/           # TypeScript types
│   └── package.json
└── package.json             # Root workspace configuration
```

## Next Steps

Once the application is running:

1. Open http://localhost:3000 in your browser
2. Enter a city name to start creating your itinerary
3. Follow the three-step process to generate your personalized travel plan

The application includes comprehensive error handling, so if something goes wrong, you'll see helpful error messages guiding you to resolve the issue.