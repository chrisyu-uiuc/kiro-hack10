# Travel Itinerary Generator

A production-ready web application that creates personalized travel itineraries using AWS Bedrock Agent. The application follows a three-step user flow: city input, spot selection, and detailed itinerary generation with timing and transportation.

## ✨ Features

- **AI-Powered Recommendations**: AWS Bedrock Agent integration for intelligent travel suggestions
- **Multi-Step Flow**: Intuitive 3-step process from city selection to complete itinerary
- **Session Management**: Maintains state across the user journey
- **Responsive Design**: Optimized for both mobile and desktop experiences
- **Real-Time Validation**: City verification and spot generation
- **Robust Error Handling**: Graceful fallbacks and comprehensive error boundaries
- **Production Ready**: 81 comprehensive tests, security measures, and performance optimizations

## 🏗️ Architecture

This is a monorepo with npm workspaces containing separate frontend and backend applications.

```
travel-itinerary-generator/
├── frontend/                 # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── components/      # 5 React components
│   │   │   ├── CityInput.tsx        # Step 1: City input form
│   │   │   ├── SpotSelection.tsx    # Step 2: Spot selection interface
│   │   │   ├── ItineraryDisplay.tsx # Step 3: Final itinerary
│   │   │   ├── LoadingSpinner.tsx   # Loading states
│   │   │   └── ErrorBoundary.tsx    # Error handling
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # Axios-based API client
│   │   └── types/           # TypeScript definitions
│   └── dist/                # Build output
├── backend/                  # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/          # 4 API endpoints
│   │   ├── services/        # AWS Bedrock integration
│   │   ├── middleware/      # Security, CORS, logging, sessions
│   │   └── __tests__/       # 81 comprehensive tests
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
   # Edit .env with your AWS credentials
   # AWS Bedrock Agent Core Configuration
   # AWS_REGION=us-east-1
   # AWS_ACCESS_KEY_ID=
   # AWS_SECRET_ACCESS_KEY=

   # Bedrock Agent Configuration
   # BEDROCK_AGENT_ID=
   # BEDROCK_AGENT_ALIAS_ID=

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
cd backend && npm test     # Run backend tests (81 tests)
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
- **Security**: Helmet, CORS, express-validator
- **Session Management**: In-memory storage with UUID
- **Testing**: Vitest with 81 comprehensive tests

### Development Tools
- **TypeScript**: Strict mode with path mapping (@/* aliases)
- **ESLint**: Standard rules + TypeScript recommended
- **Package Manager**: npm with workspaces
- **Concurrency**: concurrently for running both servers

## 🔧 AWS Configuration

The application requires the following AWS Bedrock Agent configuration:
- **Region**: us-east-1 (or your preferred region)
- **Bedrock Agent ID**: Your agent ID
- **Bedrock Agent Alias ID**: Your agent alias ID
- **Model**: Nova Pro 1.0

### AWS Bedrock Agent Prompt
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

### Required AWS Permissions
Ensure your AWS credentials have the necessary permissions:
- `bedrock:InvokeAgent`
- Access to the specified Bedrock Agent

### Security Note
⚠️ **Never commit AWS credentials to version control**. Always use environment variables and ensure your `.env` files are in `.gitignore`.

## 🎯 User Flow

The application provides a seamless three-step experience:

1. **City Input**: Users enter and verify a destination city
2. **Spot Selection**: Choose from 10-20 AI-generated recommendations
3. **Itinerary Generation**: Receive detailed travel plans with timing and transportation

## 🚀 Deployment

For production deployment on EC2, see the comprehensive guides in the `deployment/` directory:
- `ec2-quick-start.md` - Quick deployment guide
- `ec2-deployment.md` - Detailed deployment instructions
- `ec2-setup.sh` - Automated setup script

## 🧪 Testing

The backend includes 81 comprehensive tests covering:
- API endpoints and validation
- AWS Bedrock Agent integration
- Error handling and edge cases
- Session management
- Security middleware

Run tests with:
```bash
cd backend && npm test
```

## 📁 Path Mapping

Both projects use TypeScript path mapping for clean imports:
- `@/*` - src directory root
- `@/components/*` - components directory (frontend)
- `@/services/*` - services directory
- `@/types/*` - types directory
- `@/middleware/*` - middleware directory (backend)
- `@/routes/*` - routes directory (backend)

## 🔒 Security

This application handles AWS credentials and user data. Please review `SECURITY.md` for important security guidelines and best practices.

Key security considerations:
- Never commit AWS credentials to version control
- Use environment variables for all sensitive configuration
- Keep dependencies updated with `npm audit`
- Follow deployment security guidelines in production

## 🤝 Contributing

1. Follow the established naming conventions (camelCase files, PascalCase components)
2. Maintain TypeScript strict mode compliance
3. Add tests for new functionality
4. Use the provided ESLint configuration
5. Keep related files organized by feature/domain
6. Review security guidelines before submitting changes

## 📄 License

This project is licensed under the MIT License.