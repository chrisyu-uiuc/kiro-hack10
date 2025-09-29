# Google Maps Itinerary Optimization API

This document provides comprehensive documentation for the Google Maps itinerary optimization endpoints, including request/response formats, error handling, and integration examples.

## Overview

The Google Maps Itinerary Optimization API provides intelligent route optimization, real-time travel calculations, and comprehensive monitoring capabilities for travel itinerary generation.

### Key Features
- **Route Optimization**: Uses Google Maps APIs for optimal route planning
- **Fallback Support**: Graceful degradation when APIs are unavailable
- **Performance Monitoring**: Comprehensive metrics and health monitoring
- **Caching**: Intelligent caching for improved performance
- **Multi-modal Travel**: Support for walking, driving, and transit

## Authentication

All endpoints require a valid session ID obtained through the main application flow.

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3001/api
```

## Core Optimization Endpoint

### POST /api/itinerary/optimize

Generate an optimized travel itinerary using Google Maps APIs.

#### Request

**Headers**
```
Content-Type: application/json
```

**Body Parameters**

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `sessionId` | string | Yes | Session identifier | Max 100 chars, non-empty |
| `selectedSpots` | array | Yes | Selected spots for itinerary | 1-20 items |
| `selectedSpots[].id` | string | Yes | Unique spot identifier | Non-empty string |
| `selectedSpots[].name` | string | Yes | Spot name | Non-empty string |
| `selectedSpots[].category` | string | No | Spot category | Optional |
| `selectedSpots[].location` | string | No | Location description | Optional |
| `selectedSpots[].description` | string | No | Spot description | Optional |
| `selectedSpots[].duration` | string | No | Visit duration estimate | Optional |
| `city` | string | Yes | Destination city | Max 100 chars, alphanumeric + spaces |
| `travelMode` | string | No | Travel mode | 'walking', 'driving', 'transit' |
| `startTime` | string | No | Start time | HH:MM format (24-hour) |
| `visitDuration` | number | No | Default visit duration (minutes) | 15-480 |
| `includeBreaks` | boolean | No | Include breaks in itinerary | Default: true |
| `multiDay` | boolean | No | Enable multi-day itinerary | Default: false |
| `hotelLocation` | string | No | Hotel location for multi-day | Required if multiDay=true |
| `dailyStartTime` | string | No | Daily start time | HH:MM format |
| `dailyEndTime` | string | No | Daily end time | HH:MM format |

#### Example Request

```json
{
  "sessionId": "session_abc123",
  "selectedSpots": [
    {
      "id": "spot_eiffel",
      "name": "Eiffel Tower",
      "category": "Landmark",
      "location": "Champ de Mars, Paris",
      "description": "Iconic iron tower",
      "duration": "2 hours"
    },
    {
      "id": "spot_louvre",
      "name": "Louvre Museum",
      "category": "Museum",
      "location": "Rue de Rivoli, Paris",
      "description": "World's largest art museum"
    }
  ],
  "city": "Paris",
  "travelMode": "walking",
  "startTime": "09:00",
  "visitDuration": 90,
  "includeBreaks": true,
  "multiDay": false
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
      "optimizationMetrics": {
        "originalDistance": "15.2 km",
        "optimizedDistance": "12.5 km",
        "timeSaved": "45 minutes",
        "efficiencyGain": "18%"
      },
      "spots": [
        {
          "id": "spot_eiffel",
          "name": "Eiffel Tower",
          "category": "Landmark",
          "order": 1,
          "arrivalTime": "09:00",
          "departureTime": "11:00",
          "visitDuration": "2 hours",
          "coordinates": {
            "lat": 48.8584,
            "lng": 2.2945
          },
          "travelToNext": {
            "duration": "25 minutes",
            "distance": "2.1 km",
            "mode": "walking",
            "instructions": "Head southeast on Champ de Mars toward Pont de Bir-Hakeim"
          }
        },
        {
          "id": "spot_louvre",
          "name": "Louvre Museum",
          "category": "Museum",
          "order": 2,
          "arrivalTime": "11:25",
          "departureTime": "14:25",
          "visitDuration": "3 hours",
          "coordinates": {
            "lat": 48.8606,
            "lng": 2.3376
          },
          "travelToNext": null
        }
      ],
      "breaks": [
        {
          "type": "lunch",
          "time": "12:30",
          "duration": "1 hour",
          "location": "Near Louvre Museum",
          "suggestion": "Café Marly - Museum restaurant with great ambiance"
        }
      ],
      "summary": {
        "totalSpots": 2,
        "totalWalkingTime": "25 minutes",
        "totalVisitTime": "5 hours",
        "totalBreakTime": "1 hour",
        "optimizationSavings": "45 minutes saved vs unoptimized route",
        "recommendedPace": "Relaxed - plenty of time at each location"
      },
      "weatherConsiderations": {
        "indoor": 1,
        "outdoor": 1,
        "recommendation": "Check weather forecast - mix of indoor/outdoor activities"
      }
    },
    "fallbackUsed": false,
    "sessionId": "session_abc123",
    "city": "Paris",
    "spotsCount": 2,
    "message": "Successfully generated optimized itinerary with Google Maps"
  },
  "timestamp": "2023-11-20T10:30:00.000Z"
}
```

#### Error Responses

**400 - Validation Error**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "selectedSpots",
        "message": "At least one spot must be selected",
        "value": []
      },
      {
        "field": "startTime",
        "message": "Start time must be in HH:MM format (24-hour)",
        "value": "9am"
      }
    ]
  },
  "timestamp": "2023-11-20T10:30:00.000Z"
}
```

**404 - Session Not Found**
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

**400 - Invalid Spot Selection**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SPOT_SELECTION",
    "message": "Some selected spots are not valid for this session",
    "details": {
      "invalidSpots": ["spot_invalid_1", "spot_invalid_2"]
    }
  },
  "timestamp": "2023-11-20T10:30:00.000Z"
}
```

**503 - Google Maps Quota Exceeded**
```json
{
  "success": false,
  "error": {
    "code": "GOOGLE_MAPS_QUOTA_EXCEEDED",
    "message": "Google Maps service is temporarily unavailable. Please try again later.",
    "details": {
      "apiStatus": "OVER_QUERY_LIMIT",
      "quotaResetTime": "2023-11-21T00:00:00.000Z"
    }
  },
  "timestamp": "2023-11-20T10:30:00.000Z"
}
```

**429 - Rate Limited**
```json
{
  "success": false,
  "error": {
    "code": "GOOGLE_MAPS_RATE_LIMITED",
    "message": "Too many requests. Please wait a moment and try again.",
    "details": {
      "apiStatus": "OVER_QUERY_LIMIT",
      "retryAfter": "30 seconds",
      "requestsRemaining": 0
    }
  },
  "timestamp": "2023-11-20T10:30:00.000Z"
}
```

**500 - Service Error**
```json
{
  "success": false,
  "error": {
    "code": "ITINERARY_GENERATION_ERROR",
    "message": "Failed to generate optimized itinerary. Please try again later."
  },
  "timestamp": "2023-11-20T10:30:00.000Z"
}
```

#### Fallback Mode Response

When Google Maps APIs are unavailable, the system returns a basic itinerary:

```json
{
  "success": true,
  "data": {
    "itinerary": {
      "title": "Basic Itinerary for Paris",
      "city": "Paris",
      "fallbackMode": true,
      "totalDuration": "Estimated 6-8 hours",
      "spots": [
        {
          "id": "spot_eiffel",
          "name": "Eiffel Tower",
          "order": 1,
          "estimatedVisitTime": "2 hours",
          "estimatedTravelToNext": "30-45 minutes"
        },
        {
          "id": "spot_louvre",
          "name": "Louvre Museum",
          "order": 2,
          "estimatedVisitTime": "3 hours"
        }
      ],
      "notes": [
        "This is a basic itinerary without route optimization",
        "Travel times are estimates - check actual routes",
        "Consider traffic and opening hours"
      ]
    },
    "fallbackUsed": true,
    "sessionId": "session_abc123",
    "city": "Paris",
    "spotsCount": 2,
    "message": "Generated basic itinerary (Google Maps optimization unavailable)"
  },
  "timestamp": "2023-11-20T10:30:00.000Z"
}
```

## Monitoring Endpoints

### GET /api/monitoring/google-maps/metrics

Get comprehensive Google Maps API usage metrics.

#### Response (200)

```json
{
  "success": true,
  "data": {
    "metrics": {
      "totalRequests": 1250,
      "successfulRequests": 1180,
      "failedRequests": 70,
      "successRate": 94.4,
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
        "INVALID_REQUEST": 8,
        "ZERO_RESULTS": 43
      },
      "responseTimePercentiles": {
        "p50": 180,
        "p90": 450,
        "p95": 680,
        "p99": 1200
      },
      "timeRange": {
        "start": "2023-11-19T10:30:00.000Z",
        "end": "2023-11-20T10:30:00.000Z"
      }
    },
    "timestamp": "2023-11-20T10:30:00.000Z"
  }
}
```

### GET /api/monitoring/google-maps/logs

Get recent Google Maps API request logs.

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `count` | number | Number of logs to return | 50 |
| `errors` | boolean | Return only error logs | false |

#### Response (200)

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
        "requestId": "req_abc123",
        "input": "Paris, France",
        "output": "Coordinates found"
      },
      {
        "timestamp": "2023-11-20T10:29:30.456Z",
        "endpoint": "directions",
        "status": "error",
        "responseTime": 1200,
        "requestId": "req_def456",
        "error": "OVER_QUERY_LIMIT",
        "input": "Route optimization request"
      }
    ],
    "count": 50,
    "errorsOnly": false,
    "timestamp": "2023-11-20T10:30:00.000Z"
  }
}
```

### GET /api/monitoring/performance/overview

Get comprehensive performance overview.

#### Response (200)

```json
{
  "success": true,
  "data": {
    "timestamp": "2023-11-20T10:30:00.000Z",
    "cache": {
      "hitRate": 78.5,
      "totalEntries": 1250,
      "memoryUsage": 2048,
      "oldestEntry": "2023-11-19T10:30:00.000Z",
      "evictionCount": 45,
      "averageAge": "4.2 hours"
    },
    "optimization": {
      "totalOptimizations": 145,
      "successfulOptimizations": 137,
      "averageOptimizationTime": 1250.5,
      "successRate": 94.5,
      "fallbackRate": 5.5,
      "averageTimeSaved": "32 minutes",
      "averageDistanceSaved": "2.3 km"
    },
    "apiMetrics": {
      "totalRequests": 1250,
      "successRate": 94.4,
      "averageResponseTime": 245.6,
      "quotaUtilization": "67%",
      "rateLimitHits": 12
    },
    "recommendations": [
      "Cache hit rate is good (78.5%)",
      "Consider preloading popular destinations",
      "API success rate is healthy (94.4%)",
      "Quota utilization is within safe limits"
    ]
  }
}
```

### GET /api/monitoring/health

Enhanced health check with performance metrics.

#### Response (200 - Healthy)

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
      "averageResponseTime": "245ms",
      "lastSuccessfulRequest": "2023-11-20T10:29:45.123Z"
    },
    "cache": {
      "hitRate": "78.5%",
      "totalEntries": 1250,
      "memoryUsage": "2.0KB",
      "status": "healthy"
    },
    "optimization": {
      "totalOptimizations": 145,
      "averageTime": "1251ms",
      "successRate": "94.5%",
      "status": "healthy"
    },
    "overallHealth": "All systems operational",
    "timestamp": "2023-11-20T10:30:00.000Z"
  }
}
```

#### Response (503 - Degraded)

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
      "averageResponseTime": "1245ms",
      "lastError": "OVER_QUERY_LIMIT"
    },
    "cache": {
      "hitRate": "45.2%",
      "totalEntries": 890,
      "memoryUsage": "1.5KB",
      "status": "degraded"
    },
    "optimization": {
      "totalOptimizations": 145,
      "averageTime": "2451ms",
      "successRate": "78.5%",
      "status": "degraded"
    },
    "overallHealth": "Service degraded - fallback mode active",
    "issues": [
      "Google Maps API quota exceeded",
      "High response times detected",
      "Cache performance below optimal"
    ],
    "timestamp": "2023-11-20T10:30:00.000Z"
  }
}
```

## Error Handling

### Error Code Reference

| Code | HTTP Status | Description | Retry Strategy |
|------|-------------|-------------|----------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters | Fix parameters, retry |
| `SESSION_NOT_FOUND` | 404 | Session expired or invalid | Start new session |
| `INVALID_SPOT_SELECTION` | 400 | Invalid spots for session | Select valid spots |
| `GOOGLE_MAPS_QUOTA_EXCEEDED` | 503 | API quota exceeded | Wait for quota reset |
| `GOOGLE_MAPS_RATE_LIMITED` | 429 | Rate limit exceeded | Wait and retry |
| `GOOGLE_MAPS_API_ERROR` | 500 | General API error | Retry with backoff |
| `ITINERARY_GENERATION_ERROR` | 500 | Service error | Retry later |

### Retry Logic

```javascript
async function optimizeItineraryWithRetry(requestData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/itinerary/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        return result;
      }
      
      // Handle specific error codes
      if (result.error?.code === 'GOOGLE_MAPS_RATE_LIMITED') {
        const retryAfter = result.error.details?.retryAfter || '30 seconds';
        await new Promise(resolve => setTimeout(resolve, 30000));
        continue;
      }
      
      if (result.error?.code === 'GOOGLE_MAPS_QUOTA_EXCEEDED') {
        throw new Error('Service temporarily unavailable');
      }
      
      throw new Error(result.error?.message || 'Unknown error');
      
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Integration Examples

### React Frontend Integration

```typescript
import { useState } from 'react';

interface OptimizationResult {
  itinerary: any;
  fallbackUsed: boolean;
  message: string;
}

export function useItineraryOptimization() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const optimizeItinerary = async (
    sessionId: string,
    selectedSpots: any[],
    options: any = {}
  ): Promise<OptimizationResult | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/itinerary/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          selectedSpots,
          city: options.city,
          travelMode: options.travelMode || 'walking',
          startTime: options.startTime || '09:00',
          includeBreaks: options.includeBreaks !== false
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'Optimization failed');
      }
      
      return result.data;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  return { optimizeItinerary, loading, error };
}
```

### Node.js Backend Integration

```typescript
import axios from 'axios';

class ItineraryOptimizationClient {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  
  async optimizeItinerary(params: {
    sessionId: string;
    selectedSpots: any[];
    city: string;
    options?: any;
  }) {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/itinerary/optimize`,
        {
          sessionId: params.sessionId,
          selectedSpots: params.selectedSpots,
          city: params.city,
          ...params.options
        },
        {
          timeout: 30000, // 30 second timeout
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      return response.data;
      
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        throw new Error(errorData?.error?.message || error.message);
      }
      throw error;
    }
  }
  
  async getHealthStatus() {
    const response = await axios.get(`${this.baseURL}/api/monitoring/health`);
    return response.data;
  }
  
  async getPerformanceMetrics() {
    const response = await axios.get(`${this.baseURL}/api/monitoring/performance/overview`);
    return response.data;
  }
}
```

## Performance Considerations

### Caching Strategy

- **Geocoding Cache**: 24-hour TTL for address lookups
- **Route Cache**: 1-hour TTL for route calculations
- **Places Cache**: 6-hour TTL for place details
- **Memory Management**: Automatic cleanup of expired entries

### Rate Limiting

- **Google Maps APIs**: Respects API rate limits
- **Request Batching**: Combines multiple requests when possible
- **Intelligent Spacing**: Prevents rate limit violations
- **Fallback Activation**: Automatic fallback when limits exceeded

### Optimization Algorithms

1. **Primary**: Google Maps Waypoint Optimization
2. **Fallback**: Traveling Salesman Problem (TSP) solver
3. **Hybrid**: Combines both approaches for best results

### Monitoring and Alerting

- **Real-time Metrics**: API usage, success rates, response times
- **Health Checks**: Automated system health monitoring
- **Performance Tracking**: Cache hit rates, optimization success
- **Error Tracking**: Detailed error logging and analysis

## Changelog

### Version 1.2.0 (Current)
- Added multi-day itinerary support
- Enhanced error handling with specific error codes
- Improved fallback behavior
- Added comprehensive monitoring endpoints
- Performance optimizations for caching

### Version 1.1.0
- Added route optimization monitoring
- Implemented geocoding cache
- Enhanced error responses
- Added health check endpoint

### Version 1.0.0
- Initial release
- Basic itinerary optimization
- Google Maps API integration
- Session management