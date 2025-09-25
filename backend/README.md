# Travel Itinerary Backend

Backend API server for the Travel Itinerary Generator application.

## Features Implemented

### Task 3: Backend API Server Foundation ✅

- **Express Server Setup**: Configured with TypeScript support
- **CORS Middleware**: Configured for frontend communication
- **Security Headers**: Implemented using Helmet middleware
- **JSON Body Parsing**: Supports JSON payloads up to 10MB
- **Session Storage**: In-memory session management with automatic cleanup
- **Error Handling**: Comprehensive error handling with structured responses
- **Request Logging**: Detailed request/response logging with emojis
- **Health Check**: `/health` endpoint for monitoring
- **Graceful Shutdown**: Proper SIGTERM/SIGINT handling

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── index.ts          # Environment configuration
│   ├── middleware/
│   │   ├── errorHandler.ts   # Error handling middleware
│   │   ├── requestLogger.ts  # Request logging middleware
│   │   └── sessionStorage.ts # Session management
│   ├── services/
│   │   └── BedrockAgentService.ts # AWS Bedrock integration
│   ├── types/
│   │   └── express.d.ts      # TypeScript declarations
│   ├── __tests__/
│   │   └── server.test.ts    # Server foundation tests
│   └── server.ts             # Main server file
├── package.json
├── tsconfig.json
└── .env.example
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

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

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## API Endpoints

### Health Check
- `GET /health` - Returns server health status

### Future Endpoints (to be implemented)
- `POST /api/verify-city` - Verify city exists
- `POST /api/generate-spots` - Generate recommended spots
- `POST /api/store-selections` - Store user selections
- `POST /api/generate-itinerary` - Generate travel itinerary

## Session Management

The server uses in-memory session storage with:
- 24-hour session timeout
- Automatic cleanup of expired sessions
- Session data includes city, spots, selections, and itinerary

## Error Handling

All errors are handled consistently with structured responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  },
  "timestamp": "2023-11-20T10:30:00.000Z"
}
```

## Security Features

- Helmet middleware for security headers
- CORS configuration for allowed origins
- Input validation and sanitization
- Request size limits
- Environment-based configuration

## Testing

Run tests with:
```bash
npm test
```

Tests cover:
- Server startup and configuration
- Health check endpoint
- CORS headers
- JSON body parsing
- Security headers
- Error handling