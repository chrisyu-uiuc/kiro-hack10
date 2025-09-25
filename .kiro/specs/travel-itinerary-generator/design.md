# Design Document

## Overview

The Travel Itinerary Generator is a full-stack web application that provides an intuitive three-step process for creating personalized travel itineraries. The application leverages AWS Bedrock Agent to provide intelligent responses for city verification, spot recommendations, and itinerary generation. The system follows a modern web architecture with a React frontend and Node.js/Express backend.

## Architecture

### High-Level Architecture

```
React Frontend          Node.js Backend         AWS Bedrock Agent
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│  - City Input   │◄──►│  - API Routes   │◄──►│  Agent ID:      │
│  - Spot Selection│    │  - Agent Client │    │  BTATPBP5VG     │
│  - Itinerary    │    │  - Data Storage │    │  Alias ID:      │
│    Display      │    │                 │    │  JFTVDFJYFF     │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

**Frontend:**
- React with TypeScript
- React Router for navigation
- Axios for API communication
- CSS Modules or Styled Components for styling

**Backend:**
- Node.js with Express
- AWS SDK for JavaScript v3
- In-memory storage for session data (can be extended to database)
- CORS enabled for frontend communication

**AWS Services:**
- AWS Bedrock Agent Runtime
- Region: us-east-1
- Agent ID: BTATPBP5VG
- Agent Alias ID: JFTVDFJYFF

## Components and Interfaces

### Frontend Components

#### 1. App Component
- Main application container
- Manages routing between steps
- Maintains global application state

#### 2. CityInput Component
- Input form for city name
- Validation and error display
- Next button to proceed

#### 3. SpotSelection Component
- Grid/list display of recommended spots
- Checkbox selection for each spot
- Spot details (name, category, location, description)
- Selected spots counter
- Next button (enabled when spots selected)

#### 4. ItineraryDisplay Component
- Formatted display of generated itinerary
- Timeline view with spots, timing, and transportation
- Print/export functionality (future enhancement)

### Backend API Endpoints

#### 1. POST /api/verify-city
```typescript
Request: { city: string }
Response: { 
  valid: boolean, 
  city: string, 
  message?: string 
}
```

#### 2. POST /api/generate-spots
```typescript
Request: { city: string, sessionId: string }
Response: { 
  spots: Array<{
    id: string,
    name: string,
    category: string,
    location: string,
    description: string
  }>,
  sessionId: string
}
```

#### 3. POST /api/store-selections
```typescript
Request: { 
  selectedSpots: string[], 
  sessionId: string 
}
Response: { 
  success: boolean, 
  sessionId: string 
}
```

#### 4. POST /api/generate-itinerary
```typescript
Request: { sessionId: string }
Response: { 
  itinerary: {
    title: string,
    totalDuration: string,
    schedule: Array<{
      time: string,
      spot: string,
      duration: string,
      transportation: string,
      notes: string
    }>
  }
}
```

### AWS Bedrock Agent Integration

#### Agent Client Service
```typescript
class BedrockAgentService {
  private client: BedrockAgentRuntimeClient;
  private agentId: string = "BTATPBP5VG";
  private agentAliasId: string = "JFTVDFJYFF";
  
  async invokeAgent(prompt: string, sessionId: string): Promise<string>
  async verifyCityExists(city: string): Promise<boolean>
  async generateSpots(city: string, sessionId: string): Promise<Spot[]>
  async generateItinerary(selectedSpots: Spot[], sessionId: string): Promise<Itinerary>
}
```

## Data Models

### Frontend State Models

```typescript
interface AppState {
  currentStep: 'city' | 'spots' | 'itinerary';
  city: string;
  sessionId: string;
  spots: Spot[];
  selectedSpotIds: string[];
  itinerary: Itinerary | null;
  loading: boolean;
  error: string | null;
}

interface Spot {
  id: string;
  name: string;
  category: string;
  location: string;
  description: string;
}

interface Itinerary {
  title: string;
  totalDuration: string;
  schedule: ScheduleItem[];
}

interface ScheduleItem {
  time: string;
  spot: string;
  duration: string;
  transportation: string;
  notes: string;
}
```

### Backend Session Storage

```typescript
interface SessionData {
  sessionId: string;
  city: string;
  allSpots: Spot[];
  selectedSpots: Spot[];
  itinerary: Itinerary | null;
  createdAt: Date;
}
```

## Error Handling

### Frontend Error Handling
- Global error boundary for React components
- API error handling with user-friendly messages
- Loading states for all async operations
- Form validation with immediate feedback

### Backend Error Handling
- Try-catch blocks around AWS SDK calls
- Structured error responses with appropriate HTTP status codes
- Logging for debugging and monitoring
- Graceful degradation when AWS services are unavailable

### AWS Bedrock Agent Error Handling
- Retry logic for transient failures
- Timeout handling for long-running requests
- Session management for conversation continuity
- Fallback responses when agent is unavailable

## Testing Strategy

### Frontend Testing
- Unit tests for components using Jest and React Testing Library
- Integration tests for user flows
- Mock API responses for consistent testing
- Accessibility testing with axe-core

### Backend Testing
- Unit tests for API endpoints using Jest and Supertest
- Mock AWS SDK calls for isolated testing
- Integration tests with test AWS resources
- Load testing for concurrent users

### End-to-End Testing
- Cypress tests for complete user journeys
- Test data management for consistent scenarios
- Cross-browser compatibility testing

## Security Considerations

### AWS Security
- IAM roles with minimal required permissions
- AWS credentials managed through environment variables
- Session-based access control
- Input sanitization for agent prompts

### Application Security
- CORS configuration for allowed origins
- Input validation on all endpoints
- Rate limiting to prevent abuse
- HTTPS enforcement in production

## Performance Considerations

### Frontend Performance
- Code splitting for reduced initial bundle size
- Lazy loading of components
- Optimized re-renders with React.memo
- Caching of API responses where appropriate

### Backend Performance
- Connection pooling for AWS SDK clients
- In-memory session storage for fast access
- Response compression
- Efficient data serialization

### AWS Integration Performance
- Session reuse for conversation continuity
- Streaming responses where supported
- Appropriate timeout configurations
- Monitoring and alerting for response times