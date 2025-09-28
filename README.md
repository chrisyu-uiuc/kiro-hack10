# Travel Itinerary Generator

A production-ready web application that creates personalized travel itineraries using AWS Bedrock Agent and Google Places API. The application follows a three-step user flow: city input, spot selection with detailed information popups, and comprehensive itinerary generation.

## ✨ Features

- **AI-Powered Recommendations**: AWS Bedrock Agent integration for intelligent travel suggestions
- **Detailed Spot Information**: Google Places API integration with photos, reviews, ratings, and practical information
- **Interactive Photo Galleries**: Optimized image loading with lazy loading and caching
- **Comprehensive Reviews**: Real user reviews and ratings from Google Places
- **Multi-Step Flow**: Intuitive 3-step process from city selection to complete itinerary
- **Session Management**: Maintains state across the user journey with performance caching
- **Mobile-Optimized**: Touch-friendly interface with swipe gestures and responsive design
- **Advanced Error Handling**: Comprehensive error boundaries with retry mechanisms and fallback content
- **Performance Optimized**: Image optimization, request deduplication, and session caching
- **Production Ready**: 100+ comprehensive tests, security measures, and performance monitoring

## 🏗️ Architecture

This is a monorepo with npm workspaces containing separate frontend and backend applications.

```
travel-itinerary-generator/
├── frontend/                 # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── components/      # 10+ React components
│   │   │   ├── CityInput.tsx           # Step 1: City input form
│   │   │   ├── SpotSelection.tsx       # Step 2: Spot selection interface
│   │   │   ├── SpotInfoPopup.tsx       # Detailed spot information modal
│   │   │   ├── PhotoGallery.tsx        # Interactive photo gallery
│   │   │   ├── ReviewsSection.tsx      # Google Places reviews display
│   │   │   ├── OptimizedImage.tsx      # Performance-optimized image component
│   │   │   ├── ItineraryDisplay.tsx    # Step 3: Final itinerary
│   │   │   ├── LoadingSpinner.tsx      # Loading states
│   │   │   ├── ErrorBoundary.tsx       # Global error handling
│   │   │   └── SpotInfoErrorBoundary.tsx # Spot-specific error handling
│   │   ├── hooks/           # Custom React hooks (useAppState)
│   │   ├── services/        # API client with caching and deduplication
│   │   ├── utils/           # Performance, caching, and error handling utilities
│   │   └── types/           # TypeScript definitions with Google Places types
│   └── dist/                # Build output
├── backend/                  # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/          # 6 API endpoints (city + spot details)
│   │   ├── services/        # AWS Bedrock + Google Places integration
│   │   │   ├── BedrockAgentService.ts  # AWS Bedrock Agent client
│   │   │   └── GooglePlacesService.ts  # Google Places API client
│   │   ├── middleware/      # Security, CORS, logging, sessions
│   │   └── __tests__/       # 100+ comprehensive tests
│   └── dist/                # Build output
├── deployment/              # EC2 deployment scripts and guides
└── package.json             # Root workspace configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm
- AWS account with Bedrock Agent access

### Installation & Setup

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Configure environment variables:**
   ```bash
   # Backend configuration
   cd backend
   cp .env.example .env
   # Edit .env with your AWS credentials and Google Places API key
   # AWS Bedrock Agent Core Configuration
   # AWS_REGION=us-east-1
   # AWS_ACCESS_KEY_ID=
   # AWS_SECRET_ACCESS_KEY=

   # Bedrock Agent Configuration
   # BEDROCK_AGENT_ID=
   # BEDROCK_AGENT_ALIAS_ID=

   # Google Places API Configuration
   # GOOGLE_PLACES_API_KEY=

   # Server Configuration
   # PORT=3001
   # NODE_ENV=development

   # CORS Configuration
   # FRONTEND_URL=http://localhost:3000  # or http://yourip:3000 for network access

   # Frontend configuration (optional)
   cd ../frontend
   cp .env.example .env
   # Defaults work for development

   # API Configuration - Use network IP for cross-device access
   # VITE_API_URL=http://localhost:3001  # or http://yourip:3001 for network access
   # Development Configuration
   # VITE_NODE_ENV=development
   ```

3. **Start development servers:**
   ```bash
   # Start both servers concurrently
   npm run dev
   
   # Or individually:
   npm run dev:backend   # http://localhost:3001
   npm run dev:frontend  # http://localhost:3000
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000` to start creating itineraries!
   
   **Note**: For network access from other devices, replace `localhost` with your machine's IP address in the environment files.

## 📋 Available Scripts

### Setup
```bash
npm run install:all          # Install all dependencies
```

### Development
```bash
npm run dev                  # Start both frontend and backend
npm run dev:frontend         # Frontend only (port 3000)
npm run dev:backend          # Backend only (port 3001)
```

### Building
```bash
npm run build               # Build both projects
npm run build:frontend      # Build frontend only
npm run build:backend       # Build backend only
```

### Quality Assurance
```bash
npm run lint               # Lint both projects
npm run type-check         # TypeScript checking
cd backend && npm test     # Run backend tests (100+ tests)
```

## ⚙️ Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.0 with hot reload
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios
- **Styling**: Responsive CSS design

### Backend
- **Runtime**: Node.js with TypeScript (ES Modules)
- **Framework**: Express.js
- **AWS Integration**: @aws-sdk/client-bedrock-agent-runtime
- **Google Places Integration**: Google Places API with comprehensive error handling
- **Security**: Helmet, CORS, express-validator
- **Session Management**: In-memory storage with UUID
- **Caching**: Multi-layer caching (memory + session storage)
- **Testing**: Vitest with 100+ comprehensive tests

### Development Tools
- **TypeScript**: Strict mode with path mapping (@/* aliases)
- **ESLint**: Standard rules + TypeScript recommended
- **Package Manager**: npm with workspaces
- **Concurrency**: concurrently for running both servers

## 🔧 API Configuration

### AWS Bedrock Agent Setup
The application requires the following AWS Bedrock Agent configuration:
- **Region**: us-east-1 (or your preferred region)
- **Bedrock Agent ID**: Your agent ID
- **Bedrock Agent Alias ID**: Your agent alias ID
- **Model**: Nova Pro 1.0

#### AWS Bedrock Agent Prompt
The agent uses this prompt configuration:
```
You are a travel planning assistant. You help users:
1. Validate city names and provide location information
2. Discover tourist attractions and points of interest
3. Validate custom locations within cities
4. Optimize travel routes for efficiency
5. Provide travel recommendations and tips

Always provide structured, helpful responses with specific details about locations, timing, and travel advice.
```

#### Required AWS Permissions
Ensure your AWS credentials have the necessary permissions:
- `bedrock:InvokeAgent`
- Access to the specified Bedrock Agent

### Google Places API Setup
The application integrates with Google Places API for detailed spot information:

1. **Enable APIs**: Enable the following APIs in Google Cloud Console:
   - Places API (New)
   - Places API
   - Maps JavaScript API (optional, for enhanced features)

2. **Create API Key**: Generate an API key with the following restrictions:
   - **Application restrictions**: HTTP referrers (for production)
   - **API restrictions**: Limit to Places API

3. **Configure Environment**: Add your API key to the backend `.env` file:
   ```
   GOOGLE_PLACES_API_KEY=your_api_key_here
   ```

#### Google Places Features
- **Place Details**: Photos, reviews, ratings, opening hours
- **Place Search**: Find places by name and location
- **Photo Service**: Optimized image loading with multiple sizes
- **Comprehensive Error Handling**: Graceful fallbacks for API failures

### Security Notes
⚠️ **Never commit API keys to version control**. Always use environment variables and ensure your `.env` files are in `.gitignore`.

⚠️ **Restrict API Keys**: Always configure API key restrictions in production to prevent unauthorized usage.

## 🎯 User Flow

The application provides a seamless three-step experience with rich interactivity:

1. **City Input**: Users enter and verify a destination city using AWS Bedrock Agent
2. **Spot Selection**: Choose from 10-20 AI-generated recommendations with detailed information:
   - **Information Button**: Click to view comprehensive spot details
   - **Photo Galleries**: Browse high-quality images with optimized loading
   - **Reviews & Ratings**: Read authentic Google Places reviews
   - **Practical Information**: Opening hours, address, website, and directions
   - **Mobile-Optimized**: Touch-friendly interface with swipe gestures
3. **Itinerary Generation**: Receive detailed travel plans with timing and transportation

### Enhanced Features
- **Performance Optimized**: Image caching, lazy loading, and request deduplication
- **Error Resilience**: Comprehensive error handling with retry mechanisms
- **Offline Graceful**: Fallback content when APIs are unavailable
- **Accessibility**: Full keyboard navigation and screen reader support

## 🚀 Deployment

For production deployment on EC2, see the comprehensive guides in the `deployment/` directory:
- `ec2-quick-start.md` - Quick deployment guide
- `ec2-deployment.md` - Detailed deployment instructions
- `ec2-setup.sh` - Automated setup script

## 🧪 Testing

The application includes 100+ comprehensive tests covering:

### Backend Tests
- **API Endpoints**: All city and spot routes with validation
- **AWS Bedrock Agent**: Integration testing with mocked responses
- **Google Places API**: Service integration with error scenarios
- **Error Handling**: Comprehensive error boundary testing
- **Session Management**: State persistence and cleanup
- **Security Middleware**: CORS, validation, and authentication

### Frontend Tests
- **Component Testing**: All major components with React Testing Library
- **Error Boundaries**: Error handling and recovery mechanisms
- **Mobile Responsiveness**: Touch interactions and responsive design
- **Performance Utilities**: Caching, debouncing, and optimization
- **API Integration**: Service layer with mocking and error scenarios

Run tests with:
```bash
cd backend && npm test     # Backend tests
cd frontend && npm test    # Frontend tests (when available)
```

### Test Coverage
- **API Routes**: 100% endpoint coverage
- **Error Scenarios**: Comprehensive failure case testing
- **Mobile Features**: Touch gestures and responsive behavior
- **Performance**: Caching and optimization verification

## 📁 Path Mapping

Both projects use TypeScript path mapping for clean imports:
- `@/*` - src directory root
- `@/components/*` - components directory (frontend)
- `@/services/*` - services directory
- `@/types/*` - types directory
- `@/middleware/*` - middleware directory (backend)
- `@/routes/*` - routes directory (backend)

## 🤝 Contributing

1. Follow the established naming conventions (camelCase files, PascalCase components)
2. Maintain TypeScript strict mode compliance
3. Add tests for new functionality
4. Use the provided ESLint configuration
5. Keep related files organized by feature/domain
6. Review security guidelines before submitting changes

## 📄 License

This project is licensed under the MIT License.