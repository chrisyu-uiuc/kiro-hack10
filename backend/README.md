# Travel Itinerary Backend

Backend API server for the Travel Itinerary Generator application.

## Features Implemented

### Core Backend API Server ✅

- **Express Server Setup**: Configured with TypeScript support and ES modules
- **CORS Middleware**: Configured for frontend communication with flexible origin handling
- **Security Headers**: Implemented using Helmet middleware
- **JSON Body Parsing**: Supports JSON payloads up to 10MB
- **Session Storage**: In-memory session management with automatic cleanup
- **Error Handling**: Comprehensive error handling with structured responses
- **Request Logging**: Detailed request/response logging with emojis
- **Health Check**: Enhanced `/health` endpoint with performance metrics
- **Graceful Shutdown**: Proper SIGTERM/SIGINT handling

### Google Maps Integration ✅

- **Enhanced Itinerary Service**: Combines AWS Bedrock Agent with Google Maps optimization
- **Route Optimization**: TSP-based algorithms with Google Maps API integration
- **Multi-Modal Travel**: Support for walking, driving, and transit modes
- **Intelligent Caching**: Geocoding cache with 24-hour TTL and automatic cleanup
- **Performance Monitoring**: Real-time metrics and comprehensive monitoring endpoints
- **Fallback System**: Graceful degradation when APIs are unavailable
- **Error Handling**: Specific error codes for different failure scenarios

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── index.ts                    # Environment configuration
│   ├── middleware/
│   │   ├── errorHandler.ts             # Error handling middleware
│   │   ├── requestLogger.ts            # Request logging middleware
│   │   └── sessionStorage.ts           # Session management
│   ├── routes/
│   │   ├── cityRoutes.ts               # City verification endpoints
│   │   ├── spotRoutes.ts               # Spot details and selection endpoints
│   │   ├── enhancedItineraryRoutes.ts  # Google Maps optimization endpoints
│   │   └── monitoringRoutes.ts         # Performance monitoring endpoints
│   ├── services/
│   │   ├── BedrockAgentService.ts      # AWS Bedrock integration
│   │   ├── GooglePlacesService.ts      # Google Places API integration
│   │   ├── GoogleMapsService.ts        # Google Maps API integration
│   │   ├── EnhancedItineraryService.ts # Combined optimization service
│   │   ├── GeocodingCache.ts           # Intelligent geocoding cache
│   │   └── RouteOptimizationMonitor.ts # Performance monitoring
│   ├── utils/
│   │   └── googleMapsLogger.ts         # Google Maps API logging utility
│   ├── types/
│   │   ├── express.d.ts                # TypeScript declarations
│   │   └── api.ts                      # API type definitions
│   ├── __tests__/                      # Comprehensive test suite (100+ tests)
│   │   ├── services/                   # Service layer tests
│   │   ├── routes/                     # API endpoint tests
│   │   └── utils/                      # Utility tests
│   └── server.ts                       # Main server file
├── docs/
│   ├── api-optimization.md             # Complete API documentation
│   └── api-quick-reference.md          # Quick reference guide
├── scripts/
│   └── validate-google-maps-config.js  # Configuration validation
├── package.json
├── tsconfig.json
├── CHANGELOG.md
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

# Google Places API Configuration
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Google Maps API Configuration (for route optimization)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Performance Settings (optional)
GEOCODING_CACHE_TTL=86400
ROUTE_CACHE_TTL=3600
MAX_CACHE_ENTRIES=10000

# Rate Limiting (optional)
GOOGLE_MAPS_REQUESTS_PER_SECOND=10
GOOGLE_MAPS_REQUESTS_PER_DAY=25000

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

### Core Travel Endpoints
- `POST /api/verify-city` - Verify city exists
- `POST /api/generate-spots` - Generate recommended spots
- `POST /api/store-selections` - Store user selections
- `POST /api/generate-itinerary` - Generate travel itinerary

### Google Maps Optimization Endpoints

#### Itinerary Optimization
- `POST /api/itinerary/optimize` - Generate optimized itinerary with Google Maps integration

#### Monitoring & Performance
- `GET /api/monitoring/google-maps/metrics` - Get Google Maps API usage metrics
- `GET /api/monitoring/google-maps/logs` - Get recent Google Maps API request logs
- `GET /api/monitoring/google-maps/report` - Get comprehensive Google Maps API performance report
- `POST /api/monitoring/google-maps/reset` - Reset Google Maps API metrics (admin only)
- `GET /api/monitoring/performance/overview` - Get comprehensive performance overview
- `GET /api/monitoring/performance/cache` - Get geocoding cache statistics
- `GET /api/monitoring/performance/optimization` - Get route optimization performance report
- `POST /api/monitoring/performance/clear` - Clear performance data
- `POST /api/monitoring/performance/preload` - Preload common locations into cache
- `GET /api/monitoring/health` - Enhanced health check with performance metrics

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

## Google Maps Optimization API Documentation

### POST /api/itinerary/optimize

Generate an optimized travel itinerary using Google Maps APIs for route optimization, distance calculations, and travel time estimates.

#### Request Body

```typescript
{
  sessionId: string;                    // Required: Session identifier
  selectedSpots: Array<{               // Required: Array of selected spots (1-20 items)
    id: string;                        // Required: Unique spot identifier
    name: string;                      // Required: Spot name
    category?: string;                 // Optional: Spot category
    location?: string;                 // Optional: Location description
    description?: string;              // Optional: Spot description
    duration?: string;                 // Optional: Visit duration estimate
  }>;
  city: string;                        // Required: Destination city (max 100 chars)
  travelMode?: 'walking' | 'driving' | 'transit';  // Optional: Travel mode (default: 'walking')
  startTime?: string;                  // Optional: Start time in HH:MM format (default: '09:00')
  visitDuration?: number;              // Optional: Default visit duration in minutes (15-480, default: 60)
  includeBreaks?: boolean;             // Optional: Include breaks in itinerary (default: true)
  multiDay?: boolean;                  // Optional: Enable multi-day itinerary
  hotelLocation?: string;              // Optional: Hotel location for multi-day trips
  dailyStartTime?: string;             // Optional: Daily start time for multi-day trips
  dailyEndTime?: string;               // Optional: Daily end time for multi-day trips
}
```

#### Success Response (200)

```json
{
  "success": true,
  "data": {
    "itinerary": {
      "title": "Optimized Itinerary for Paris",
      "city": "Paris",
      "totalDuration": "8 hours 30 minutes",
      "totalDistance": "12.5 km",
      "travelMode": "walking",
      "startTime": "09:00",
      "endTime": "17:30",
      "spots": [
        {
          "id": "spot_1",
          "name": "Eiffel Tower",
          "category": "Landmark",
          "arrivalTime": "09:00",
          "departureTime": "10:30",
          "visitDuration": "1 hour 30 minutes",
          "travelToNext": {
            "duration": "25 minutes",
            "distance": "2.1 km",
            "mode": "walking"
          },
          "coordinates": {
            "lat": 48.8584,
            "lng": 2.2945
          }
        }
      ],
      "breaks": [
        {
          "type": "lunch",
          "time": "12:30",
          "duration": "1 hour",
          "suggestion": "Café near Louvre Museum"
        }
      ],
      "summary": {
        "totalSpots": 6,
        "totalWalkingTime": "2 hours 15 minutes",
        "totalVisitTime": "6 hours 15 minutes",
        "optimizationSavings": "45 minutes saved vs unoptimized route"
      }
    },
    "fallbackUsed": false,
    "sessionId": "session_123",
    "city": "Paris",
    "spotsCount": 6,
    "message": "Successfully generated optimized itinerary with Google Maps"
  },
  "timestamp": "2023-11-20T10:30:00.000Z"
}
```

#### Error Responses

**Validation Error (400)**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "selectedSpots",
        "message": "At least one spot must be selected"
      }
    ]
  },
  "timestamp": "2023-11-20T10:30:00.000Z"
}
```

**Session Not Found (404)**
```json
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Session not found. Please start over."
  },
  "timestamp": "2023-11-20T10:30:00.000Z"
}
```

**Google Maps Quota Exceeded (503)**
```json
{
  "success": false,
  "error": {
    "code": "GOOGLE_MAPS_QUOTA_EXCEEDED",
    "message": "Google Maps service is temporarily unavailable. Please try again later.",
    "details": {
      "apiStatus": "OVER_QUERY_LIMIT"
    }
  },
  "timestamp": "2023-11-20T10:30:00.000Z"
}
```

**Rate Limited (429)**
```json
{
  "success": false,
  "error": {
    "code": "GOOGLE_MAPS_RATE_LIMITED",
    "message": "Too many requests. Please wait a moment and try again.",
    "details": {
      "apiStatus": "OVER_QUERY_LIMIT",
      "retryAfter": "30 seconds"
    }
  },
  "timestamp": "2023-11-20T10:30:00.000Z"
}
```

**Fallback Mode Response (200)**
```json
{
  "success": true,
  "data": {
    "itinerary": {
      "title": "Basic Itinerary for Paris",
      "city": "Paris",
      "fallbackMode": true,
      "spots": [
        {
          "id": "spot_1",
          "name": "Eiffel Tower",
          "estimatedTime": "2 hours",
          "order": 1
        }
      ]
    },
    "fallbackUsed": true,
    "sessionId": "session_123",
    "city": "Paris",
    "spotsCount": 6,
    "message": "Generated basic itinerary (Google Maps optimization unavailable)"
  },
  "timestamp": "2023-11-20T10:30:00.000Z"
}
```

### Monitoring Endpoints

#### GET /api/monitoring/google-maps/metrics

Get comprehensive Google Maps API usage metrics.

**Response (200)**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalRequests": 1250,
      "successfulRequests": 1180,
      "failedRequests": 70,
      "quotaExceededCount": 5,
      "rateLimitedCount": 12,
      "averageResponseTime": 245.6,
      "requestsByEndpoint": {
        "geocoding": 450,
        "directions": 380,
        "places": 420
      },
      "errorsByType": {
        "OVER_QUERY_LIMIT": 17,
        "REQUEST_DENIED": 2,
        "INVALID_REQUEST": 8
      }
    },
    "timestamp": "2023-11-20T10:30:00.000Z"
  }
}
```

#### GET /api/monitoring/google-maps/logs

Get recent Google Maps API request logs.

**Query Parameters**
- `count` (optional): Number of logs to return (default: 50)
- `errors` (optional): Set to 'true' to return only error logs

**Response (200)**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "timestamp": "2023-11-20T10:29:45.123Z",
        "endpoint": "geocoding",
        "status": "success",
        "responseTime": 234,
        "requestId": "req_abc123"
      }
    ],
    "count": 50,
    "errorsOnly": false,
    "timestamp": "2023-11-20T10:30:00.000Z"
  }
}
```

#### GET /api/monitoring/performance/overview

Get comprehensive performance overview including cache and optimization metrics.

**Response (200)**
```json
{
  "success": true,
  "data": {
    "timestamp": "2023-11-20T10:30:00.000Z",
    "cache": {
      "hitRate": 78.5,
      "totalEntries": 1250,
      "memoryUsage": 2048,
      "oldestEntry": "2023-11-19T10:30:00.000Z"
    },
    "optimization": {
      "totalOptimizations": 145,
      "averageOptimizationTime": 1250.5,
      "successRate": 94.5,
      "fallbackRate": 5.5
    },
    "apiMetrics": {
      "totalRequests": 1250,
      "successRate": 94.4,
      "averageResponseTime": 245.6
    },
    "recommendations": [
      "Cache hit rate is good (78.5%)",
      "Consider preloading popular destinations",
      "API success rate is healthy (94.4%)"
    ]
  }
}
```

#### POST /api/monitoring/performance/clear

Clear performance data (cache, optimization metrics, logs).

**Request Body**
```json
{
  "cache": true,
  "optimization": true,
  "logs": true
}
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "message": "Performance data cleared successfully",
    "cleared": ["cache", "optimization", "logs"],
    "timestamp": "2023-11-20T10:30:00.000Z"
  }
}
```

#### GET /api/monitoring/health

Enhanced health check endpoint with performance metrics.

**Response (200 - Healthy)**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "googleMapsApi": {
      "totalRequests": 1250,
      "successRate": "94.4%",
      "quotaIssues": false,
      "rateLimitIssues": false,
      "averageResponseTime": "245ms"
    },
    "cache": {
      "hitRate": "78.5%",
      "totalEntries": 1250,
      "memoryUsage": "2.0KB"
    },
    "optimization": {
      "totalOptimizations": 145,
      "averageTime": "1251ms",
      "successRate": "94.5%"
    },
    "timestamp": "2023-11-20T10:30:00.000Z"
  }
}
```

**Response (503 - Degraded)**
```json
{
  "success": true,
  "data": {
    "status": "degraded",
    "googleMapsApi": {
      "totalRequests": 1250,
      "successRate": "75.2%",
      "quotaIssues": true,
      "rateLimitIssues": true,
      "averageResponseTime": "1245ms"
    },
    "timestamp": "2023-11-20T10:30:00.000Z"
  }
}
```

## Error Codes Reference

### Validation Errors
- `VALIDATION_ERROR` - Invalid request parameters
- `SESSION_NOT_FOUND` - Session not found or expired
- `INVALID_SPOT_SELECTION` - Selected spots are not valid for session

### Google Maps API Errors
- `GOOGLE_MAPS_QUOTA_EXCEEDED` - API quota exceeded (503)
- `GOOGLE_MAPS_RATE_LIMITED` - Rate limit exceeded (429)
- `GOOGLE_MAPS_API_ERROR` - General Google Maps API error

### Service Errors
- `ITINERARY_GENERATION_ERROR` - Failed to generate itinerary
- `ENHANCED_ITINERARY_ERROR` - Enhanced itinerary service error
- `METRICS_ERROR` - Failed to fetch metrics
- `LOGS_ERROR` - Failed to fetch logs
- `REPORT_ERROR` - Failed to generate report

## Fallback Behavior

When Google Maps APIs are unavailable or rate-limited, the system automatically falls back to:

1. **Basic Itinerary Generation**: Creates a simple itinerary without optimization
2. **Cached Data**: Uses previously cached geocoding and route data when available
3. **Estimated Times**: Provides estimated visit and travel times based on defaults
4. **Graceful Degradation**: Returns partial results with clear indication of fallback mode

### Fallback Triggers
- Google Maps API quota exceeded
- Rate limiting active
- Network connectivity issues
- API service unavailable
- Invalid API credentials

### Fallback Response Indicators
- `fallbackUsed: true` in response
- Modified success message indicating fallback mode
- Simplified itinerary structure without detailed routing
- Performance metrics showing fallback usage rates

## Performance Optimization Features

### Geocoding Cache
- **TTL**: 24 hours for geocoding results
- **Memory Management**: Automatic cleanup of expired entries
- **Hit Rate Monitoring**: Tracks cache effectiveness
- **Preloading**: Support for preloading common destinations

### Route Optimization
- **Algorithm**: Uses Google Maps Directions API with waypoint optimization
- **Fallback**: TSP-based optimization when Google Maps unavailable
- **Monitoring**: Tracks optimization success rates and performance
- **Caching**: Caches route calculations for identical requests

### Request Batching
- **Geocoding**: Batches multiple address lookups
- **Places**: Optimizes Places API requests
- **Rate Limiting**: Intelligent request spacing to avoid limits

## Integration Examples

### Frontend Integration

```typescript
// Optimize itinerary
const response = await fetch('/api/itinerary/optimize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'session_123',
    selectedSpots: [
      { id: 'spot_1', name: 'Eiffel Tower' },
      { id: 'spot_2', name: 'Louvre Museum' }
    ],
    city: 'Paris',
    travelMode: 'walking',
    startTime: '09:00',
    includeBreaks: true
  })
});

const result = await response.json();
if (result.success) {
  console.log('Optimized itinerary:', result.data.itinerary);
  if (result.data.fallbackUsed) {
    console.warn('Fallback mode was used');
  }
}
```

### Monitoring Integration

```typescript
// Check system health
const health = await fetch('/api/monitoring/health');
const healthData = await health.json();

if (healthData.data.status === 'degraded') {
  console.warn('System performance is degraded');
}

// Get performance metrics
const metrics = await fetch('/api/monitoring/performance/overview');
const metricsData = await metrics.json();
console.log('Cache hit rate:', metricsData.data.cache.hitRate);
```