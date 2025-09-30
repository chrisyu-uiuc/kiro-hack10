# Enhanced Itinerary Service Documentation

## Overview

The Enhanced Itinerary Service is the core optimization engine that combines AWS Bedrock Agent insights with Google Maps APIs to create intelligent, optimized travel itineraries. This service represents a significant advancement over basic itinerary generation by providing real-time route optimization, accurate travel times, and intelligent scheduling.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                Enhanced Itinerary Service                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │ Bedrock Agent   │    │ Google Maps     │    │ Fallback     │ │
│  │ Service         │    │ Service         │    │ System       │ │
│  │                 │    │                 │    │              │ │
│  │ • AI Insights   │    │ • Route Opt.    │    │ • Basic TSP  │ │
│  │ • Duration Rec. │    │ • Travel Times  │    │ • Estimates  │ │
│  │ • Spot Notes    │    │ • Navigation    │    │ • Sequential │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
│           │                       │                       │     │
│           └───────────┬───────────┘───────────────────────┘     │
│                       │                                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │            Schedule Enhancement Engine                      │ │
│  │                                                             │ │
│  │ • Multi-day scheduling with 9am-8pm constraints            │ │
│  │ • Intelligent meal break insertion                         │ │
│  │ • Duration preservation from AI recommendations            │ │
│  │ • Travel time integration and validation                   │ │
│  │ • Sequential timing with no overlaps                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Intelligent Service Integration
- **Bedrock Agent Integration**: Leverages AI insights for spot recommendations and duration estimates
- **Google Maps Optimization**: Uses real-time routing and travel time calculations
- **Seamless Fallback**: Automatically switches to basic algorithms when APIs are unavailable
- **Error Recovery**: Comprehensive error handling with graceful degradation

### 2. Advanced Scheduling Engine
- **Multi-Day Support**: Automatically splits large itineraries across multiple days
- **Time Constraints**: Respects 9am-8pm daily limits with proper day transitions
- **Duration Intelligence**: Preserves AI-recommended visit times (museums: 2-3 hours, parks: 1-2 hours)
- **Meal Break Integration**: Smart placement of lunch and dinner breaks based on actual timing

### 3. Route Optimization
- **TSP Algorithm**: Traveling Salesman Problem solver for optimal route ordering
- **Google Maps Integration**: Uses Google Maps Waypoint Optimization when available
- **Multi-Modal Support**: Walking, driving, and public transit modes
- **Real Travel Times**: Accurate calculations using Distance Matrix API

### 4. Performance & Monitoring
- **Geocoding Cache**: 24-hour TTL cache for address lookups
- **Route Caching**: 1-hour TTL for route calculations
- **Performance Metrics**: Real-time monitoring of optimization success rates
- **Health Monitoring**: Comprehensive health checks and alerting

## API Integration

### Primary Endpoint

**POST /api/itinerary/optimize**

This endpoint combines all the Enhanced Itinerary Service capabilities:

```typescript
interface OptimizeRequest {
  sessionId: string;
  selectedSpots: Spot[];
  city: string;
  travelMode?: 'walking' | 'driving' | 'transit';
  startTime?: string;
  visitDuration?: number;
  includeBreaks?: boolean;
  multiDay?: boolean;
  hotelLocation?: string;
  dailyStartTime?: string;
  dailyEndTime?: string;
}
```

### Response Format

```typescript
interface OptimizeResponse {
  success: boolean;
  data: {
    itinerary: OptimizedItinerary;
    fallbackUsed: boolean;
    sessionId: string;
    city: string;
    spotsCount: number;
    message: string;
  };
  timestamp: string;
}
```

## Service Components

### 1. EnhancedItineraryService

The main orchestration service that coordinates all optimization activities.

**Key Methods:**
- `generateEnhancedItinerary()`: Main entry point for optimization
- `generateOptimizedItinerary()`: Core optimization logic
- `validateOptions()`: Input validation and sanitization

**Features:**
- Combines Bedrock Agent insights with Google Maps routing
- Handles large itineraries (10+ spots) with optimized processing
- Provides comprehensive error handling and fallback support

### 2. GoogleMapsService

Handles all Google Maps API interactions with intelligent caching and error handling.

**Key Methods:**
- `createOptimizedItinerary()`: Route optimization using Google Maps
- `optimizeRoute()`: TSP-based route optimization
- `calculateDistanceMatrix()`: Travel time calculations
- `geocodeLocation()`: Address to coordinate conversion

**Features:**
- Intelligent caching to reduce API usage
- Fallback algorithms when APIs are unavailable
- Comprehensive error handling with specific error types

### 3. GeocodingCache

Intelligent caching system for geocoding results to improve performance and reduce costs.

**Features:**
- 24-hour TTL for geocoding results
- Automatic cleanup of expired entries
- Memory usage monitoring
- Hit rate tracking

### 4. RouteOptimizationMonitor

Performance monitoring system for tracking optimization success and system health.

**Features:**
- Real-time metrics collection
- Success rate tracking
- Performance alerting
- Health status reporting

## Multi-Day Scheduling

The Enhanced Itinerary Service includes sophisticated multi-day scheduling capabilities:

### Daily Constraints
- **Start Time**: 9:00 AM (configurable)
- **End Time**: 8:00 PM (configurable)
- **Maximum Daily Duration**: 11 hours of activities
- **Day Transitions**: Automatic when activities would exceed daily limits

### Day Labeling
- **Bold Day Headers**: Clear **Day 1**, **Day 2** formatting
- **No Duplicates**: Prevents duplicate day labels in schedule
- **Proper Sequencing**: Ensures logical day progression

### Example Multi-Day Output
```
**Day 1** - Metropolitan Museum of Art
📍 Arrive: 09:00 🚀 Depart: 11:00 ⏱️ 120 mins

Central Park
📍 Arrive: 11:15 🚀 Depart: 12:45 ⏱️ 90 mins

🍽️ Lunch Break
📍 Arrive: 12:45 🚀 Depart: 13:45 ⏱️ 60 mins

**Day 2** - Times Square
📍 Arrive: 09:00 🚀 Depart: 10:00 ⏱️ 60 mins
```

## Meal Break Intelligence

The service includes smart meal break insertion based on actual schedule timing:

### Lunch Breaks
- **Target Time**: 12:00 PM
- **Window**: 11:00 AM - 2:00 PM
- **Duration**: 60 minutes
- **Placement**: Between morning and afternoon activities

### Dinner Breaks
- **Target Time**: 6:00 PM
- **Window**: 4:30 PM - 7:00 PM
- **Duration**: 90 minutes
- **Placement**: Between afternoon and evening activities

### Smart Logic
- Avoids duplicate meal breaks
- Considers existing schedule gaps
- Respects daily time constraints
- Provides location-appropriate suggestions

## Error Handling & Fallback System

### Error Types
1. **Google Maps API Errors**
   - Quota exceeded (503 response)
   - Rate limiting (429 response)
   - Invalid requests (400 response)
   - Network failures

2. **Bedrock Agent Errors**
   - Service unavailable
   - Invalid session
   - Timeout errors

3. **Validation Errors**
   - Invalid input parameters
   - Missing required fields
   - Constraint violations

### Fallback Hierarchy
1. **Primary**: Bedrock Agent + Google Maps optimization
2. **Fallback 1**: Bedrock Agent + basic TSP optimization
3. **Fallback 2**: Basic sequential itinerary with estimates
4. **Last Resort**: Simple time-based scheduling

### Error Response Format
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

## Performance Optimization

### Caching Strategy
- **Geocoding Cache**: 24-hour TTL, automatic cleanup
- **Route Cache**: 1-hour TTL for route calculations
- **Session Cache**: Maintains optimization results
- **Memory Management**: Intelligent cache size limits

### Request Optimization
- **Batch Processing**: Combines multiple API requests
- **Request Deduplication**: Avoids duplicate API calls
- **Intelligent Spacing**: Prevents rate limit violations
- **Parallel Processing**: Concurrent API requests where possible

### Large Itinerary Handling
- **Threshold**: 10+ spots trigger optimized processing
- **Chunked Processing**: Breaks large requests into manageable pieces
- **Timeout Management**: Prevents long-running operations
- **Progressive Enhancement**: Basic results first, then optimization

## Monitoring & Health Checks

### Real-Time Metrics
- **API Usage**: Request counts, success rates, response times
- **Cache Performance**: Hit rates, memory usage, eviction counts
- **Optimization Success**: Success rates, time savings, distance savings
- **Error Tracking**: Error types, frequencies, resolution times

### Health Endpoints
- **GET /api/monitoring/health**: Overall system health
- **GET /api/monitoring/performance/overview**: Detailed performance metrics
- **GET /api/monitoring/google-maps/metrics**: Google Maps API specific metrics

### Alerting
- **Quota Warnings**: Alert when approaching API limits
- **Performance Degradation**: Alert on high response times
- **Error Rate Spikes**: Alert on increased error rates
- **Cache Issues**: Alert on low hit rates or memory issues

## Testing Strategy

The Enhanced Itinerary Service includes comprehensive testing:

### Unit Tests
- Service method testing with mocked dependencies
- Error handling validation
- Input validation testing
- Cache behavior verification

### Integration Tests
- End-to-end API testing
- Multi-service integration validation
- Fallback behavior testing
- Performance testing

### Test Coverage
- **Service Layer**: 100% method coverage
- **Error Scenarios**: All error paths tested
- **Fallback Logic**: Complete fallback chain testing
- **Performance**: Load testing and optimization validation

## Configuration

### Environment Variables
```bash
# Google Maps API Configuration
GOOGLE_MAPS_API_KEY=your_api_key_here

# Performance Settings
GEOCODING_CACHE_TTL=86400          # 24 hours
ROUTE_CACHE_TTL=3600               # 1 hour
MAX_CACHE_ENTRIES=10000            # Maximum cache entries

# Rate Limiting
GOOGLE_MAPS_REQUESTS_PER_SECOND=10
GOOGLE_MAPS_REQUESTS_PER_DAY=25000

# Optimization Settings
MAX_SPOTS_FOR_FULL_OPTIMIZATION=8  # Threshold for fast optimization
OPTIMIZATION_TIMEOUT=45000          # 45 seconds
FALLBACK_TIMEOUT=30000             # 30 seconds
```

### Tuning Parameters
- **Cache TTL**: Adjust based on data freshness requirements
- **Rate Limits**: Configure based on API quotas
- **Timeouts**: Balance between accuracy and responsiveness
- **Optimization Thresholds**: Tune for performance vs. accuracy

## Best Practices

### API Usage
1. **Enable Caching**: Always use geocoding cache in production
2. **Monitor Quotas**: Set up alerts for API usage limits
3. **Handle Errors**: Implement proper error handling and fallbacks
4. **Rate Limiting**: Respect API rate limits to avoid blocking

### Performance
1. **Batch Requests**: Combine multiple API calls when possible
2. **Cache Warming**: Preload common destinations
3. **Timeout Management**: Set appropriate timeouts for different operations
4. **Memory Management**: Monitor cache memory usage

### Monitoring
1. **Health Checks**: Implement comprehensive health monitoring
2. **Performance Metrics**: Track key performance indicators
3. **Error Tracking**: Monitor and alert on error patterns
4. **User Experience**: Track optimization success from user perspective

## Future Enhancements

### Planned Features
1. **Machine Learning**: Learn from user preferences and optimize accordingly
2. **Weather Integration**: Consider weather conditions in scheduling
3. **Real-Time Updates**: Dynamic re-optimization based on real-time conditions
4. **Advanced Constraints**: Support for more complex scheduling constraints

### Scalability Improvements
1. **Distributed Caching**: Redis-based caching for multi-instance deployments
2. **Queue System**: Background processing for large optimizations
3. **Database Integration**: Persistent storage for optimization results
4. **Microservices**: Split into smaller, focused services

## Troubleshooting

### Common Issues

1. **High Response Times**
   - Check Google Maps API response times
   - Verify cache hit rates
   - Monitor system resource usage

2. **Optimization Failures**
   - Check API quotas and rate limits
   - Verify API key permissions
   - Review error logs for specific failures

3. **Cache Issues**
   - Monitor memory usage
   - Check cache hit rates
   - Verify TTL settings

4. **Multi-Day Scheduling Problems**
   - Verify daily time constraints
   - Check day transition logic
   - Review meal break insertion

### Debugging Tools
- **Monitoring Endpoints**: Real-time system status
- **Log Analysis**: Detailed request/response logging
- **Performance Metrics**: Historical performance data
- **Health Checks**: System component status

The Enhanced Itinerary Service represents a significant advancement in travel itinerary generation, combining the power of AI insights with real-time optimization to create truly intelligent travel planning experiences.