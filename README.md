# AI Trip Planner

Create personalized travel itineraries using AI and Google Maps. Simple 3-step process: enter a city, select spots, get an optimized itinerary.

## Features

- **AI-Powered**: Uses AWS Bedrock Agent for smart travel recommendations
- **Route Optimization**: Google Maps integration for optimal routes and real travel times
- **Rich Spot Details**: Photos, reviews, and ratings from Google Places
- **Multi-Day Support**: Automatically splits large itineraries across days
- **Mobile-Friendly**: Responsive design with touch gestures

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **AI**: AWS Bedrock Agent (Nova Pro 1.0)
- **Maps**: Google Maps Platform APIs
- **Testing**: Vitest with 100+ tests

## Quick Start

### Prerequisites
- Node.js 18+
- AWS account with Bedrock Agent access
- Google Cloud Platform account

### Setup

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Configure environment:**
   ```bash
   cd backend
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```bash
   # AWS Configuration
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   
   # Bedrock Agent
   BEDROCK_AGENT_ID=your_agent_id
   BEDROCK_AGENT_ALIAS_ID=your_alias_id
   
   # Google APIs
   GOOGLE_PLACES_API_KEY=your_places_key
   GOOGLE_MAPS_API_KEY=your_maps_key
   
   # Server
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

4. **Open browser:**
   Navigate to `http://localhost:3000`

## Scripts

```bash
npm run dev          # Start both frontend and backend
npm run build        # Build both projects
npm run test         # Run tests
npm run lint         # Lint code
```

## API Setup

### AWS Bedrock Agent
1. Create a Bedrock Agent in AWS Console
2. Configure with travel planning prompt
3. Get your Agent ID and Alias ID

### Google Maps Platform
1. Enable these APIs in Google Cloud Console:
   - Places API
   - Geocoding API
   - Distance Matrix API
2. Create API keys with appropriate restrictions
3. Add keys to your `.env` file

## How It Works

1. **City Input**: Enter a destination city
2. **Spot Selection**: Choose from AI-generated recommendations with photos and reviews
3. **Itinerary**: Get an optimized travel plan with routes and timing

## Documentation

- **[Enhanced Itinerary Service](ENHANCED_ITINERARY_SERVICE.md)** - Core optimization engine details
- **[API Documentation](backend/docs/api-optimization.md)** - Complete API reference
- **[Deployment Guide](deployment/ec2-deployment.md)** - Production deployment instructions

## License

MIT License