# Travel Itinerary Generator

A web application that helps users create personalized travel itineraries using AWS Bedrock Agent.

## Project Structure

```
travel-itinerary-generator/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API services
│   │   └── types/           # TypeScript type definitions
│   ├── public/              # Static assets
│   └── package.json
├── backend/                  # Node.js/Express backend
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic services
│   │   ├── middleware/      # Express middleware
│   │   └── types/           # TypeScript type definitions
│   └── package.json
└── package.json             # Root package.json for workspace management
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- AWS account with Bedrock Agent access

## Setup Instructions

1. **Clone the repository and install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Configure environment variables:**
   
   Backend configuration:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your AWS credentials and configuration
   ```
   
   Frontend configuration:
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env if needed (default API URL should work for development)
   ```

3. **Start the development servers:**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start them separately:
   npm run dev:backend  # Starts backend on http://localhost:3001
   npm run dev:frontend # Starts frontend on http://localhost:3000
   ```

## Available Scripts

- `npm run install:all` - Install dependencies for both frontend and backend
- `npm run dev` - Start both development servers concurrently
- `npm run build` - Build both frontend and backend for production
- `npm run lint` - Run ESLint on both projects
- `npm run type-check` - Run TypeScript type checking on both projects

## AWS Configuration

The application requires the following AWS Bedrock Agent configuration:
- AWS Region: us-east-1
- Bedrock Agent ID: BTATPBP5VG
- Bedrock Agent Alias ID: JFTVDFJYFF

Make sure your AWS credentials have the necessary permissions to invoke Bedrock Agent Runtime.

## Development

The application follows a three-step user flow:
1. City input and verification
2. Spot selection from recommendations
3. Itinerary generation and display

Both frontend and backend are configured with TypeScript, ESLint, and hot reloading for efficient development.