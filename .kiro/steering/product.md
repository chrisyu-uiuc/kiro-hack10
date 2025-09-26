# Product Overview

## Travel Itinerary Generator

A web application that creates personalized travel itineraries using AWS Bedrock Agent. The application follows a three-step user flow:

1. **City Input & Verification** - Users enter a destination city which is validated
2. **Spot Selection** - Users choose from AI-recommended attractions and points of interest
3. **Itinerary Generation** - A complete travel itinerary is generated based on selected spots

## Key Features

- AI-powered destination recommendations using AWS Bedrock Agent
- Session-based user flow with state management
- Responsive React frontend with TypeScript
- RESTful API backend with Express.js
- Flexible CORS configuration for multi-environment deployment
- Health monitoring and error handling

## AWS Integration

- **AWS Bedrock Agent**: Core AI service for travel recommendations
- **Agent ID**: BTATPBP5VG
- **Alias ID**: JFTVDFJYFF
- **Region**: us-east-1

## Target Deployment

- Development: Local with hot reloading
- Production: AWS EC2 with automated deployment scripts
- Alternative: Vercel (frontend) + Railway (backend)