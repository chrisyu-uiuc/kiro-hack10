# Google Maps Itinerary Optimization - Design Document

## Architecture Overview

The enhanced itinerary system combines AWS Bedrock Agent's travel recommendations with Google Maps APIs for realistic routing and timing.

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │  External APIs  │
│                 │    │                  │    │                 │
│ ItineraryDisplay│───▶│EnhancedItinerary │───▶│ Google Maps API │
│                 │    │Service           │    │                 │
│ - Route Options │    │                  │    │ - Geocoding     │
│ - Travel Mode   │    │ ┌──────────────┐ │    │ - Distance      │
│ - Start Time    │    │ │GoogleMaps    │ │    │ - Directions    │
│                 │    │ │Service       │ │    │                 │
│                 │    │ └──────────────┘ │    │                 │
│                 │    │                  │    │                 │
│                 │    │ ┌──────────────┐ │    │ AWS Bedrock     │
│                 │    │ │BedrockAgent  │ │───▶│ Agent           │
│                 │    │ │Service       │ │    │                 │
│                 │    │ └──────────────┘ │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Core Components

### 1. GoogleMapsService
**Purpose**: Handle all Google Maps API interactions
**Key Methods**:
- `geocodeLocation()` - Convert addresses to coordinates
- `calculateDistanceMatrix()` - Get travel times between locations
- `optimizeRoute()` - Find optimal visit order using TSP algorithm
- `generateSchedule()` - Create time-based schedule with realistic timing

### 2. EnhancedItineraryService
**Purpose**: Orchestrate Bedrock Agent and Google Maps integration
**Key Methods**:
- `generateOptimizedItinerary()` - Main entry point
- `enhanceScheduleWithInsights()` - Combine Google Maps routing with Bedrock insights
- `addMealBreaks()` - Insert automatic meal breaks

### 3. Enhanced Frontend Components
**Purpose**: Provide user controls for route optimization
**Features**:
- Travel mode selection (walking/driving/transit)
- Start time picker
- Route optimization toggle
- Real-time regeneration

## Data Flow

### 1. Itinerary Generation Process
```
1. User selects spots and clicks "Generate Itinerary"
2. Frontend sends optimization request with preferences
3. EnhancedItineraryService receives request
4. GoogleMapsService calculates distance matrix for all spots
5. Route optimization algorithm finds optimal order
6. Schedule generation creates realistic timing
7. BedrockAgentService adds travel insights and recommendations
8. Enhanced schedule returned to frontend
9. Frontend displays optimized itinerary with navigation links
```

### 2. Route Optimization Algorithm
```
Input: List of spot names/addresses
1. Geocode all locations to get coordinates
2. Calculate distance matrix (N×N travel times)
3. Apply nearest neighbor TSP algorithm:
   - Start at first spot
   - Always visit nearest unvisited spot next
   - Continue until all spots visited
4. Generate route steps with navigation URLs
5. Calculate total travel time and distance
```

### 3. Schedule Generation
```
Input: Optimized route + preferences
1. Start at specified time (default 09:00)
2. For each spot:
   - Set arrival time
   - Add visit duration (default 60 mins)
   - Set departure time
   - Add travel time to next spot
3. Insert meal breaks at appropriate times
4. Add navigation URLs for each leg
5. Enhance with Bedrock Agent insights
```

## API Integration

### Google Maps APIs Used
1. **Geocoding API**: Convert spot names to coordinates
2. **Distance Matrix API**: Calculate travel times between multiple points
3. **Directions API**: Get detailed routing (future enhancement)

### Request Patterns
- **Batch Processing**: Calculate all distances in single API call
- **Caching**: Cache geocoding results to reduce API calls
- **Error Handling**: Graceful fallback to basic itinerary on API failures
- **Rate Limiting**: Respect Google Maps API quotas

## User Experience Enhancements

### 1. Interactive Controls
- **Travel Mode**: Walking, driving, or public transit
- **Start Time**: Customizable start time
- **Optimization Toggle**: Enable/disable Google Maps optimization
- **Real-time Updates**: Regenerate itinerary with new settings

### 2. Enhanced Display
- **Arrival/Departure Times**: Show precise timing
- **Travel Information**: Display travel time and mode between spots
- **Navigation Links**: Direct links to Google Maps navigation
- **Route Summary**: Total travel time and distance

### 3. Fallback Strategy
- **Primary**: Google Maps optimized route
- **Fallback**: Basic Bedrock Agent itinerary if optimization fails
- **Graceful Degradation**: Show partial information if some APIs fail

## Performance Considerations

### 1. API Efficiency
- **Single Distance Matrix Call**: Calculate all spot-to-spot distances at once
- **Request Deduplication**: Avoid duplicate geocoding requests
- **Caching Strategy**: Cache results for repeated requests

### 2. Algorithm Complexity
- **TSP Algorithm**: O(n²) nearest neighbor (good for <20 spots)
- **Future Enhancement**: More sophisticated algorithms for larger datasets
- **Timeout Handling**: 5-second limit for route optimization

### 3. Error Recovery
- **API Failures**: Fall back to basic itinerary
- **Partial Data**: Use available information when some calls fail
- **User Feedback**: Clear error messages and retry options

## Security & Configuration

### 1. API Key Management
- **Environment Variables**: Store Google Maps API key securely
- **Key Restrictions**: Limit API key to specific domains/IPs
- **Usage Monitoring**: Track API usage to avoid quota exceeded

### 2. Input Validation
- **Spot Limits**: Maximum 20 spots for optimization
- **Time Validation**: Validate start time format
- **Mode Validation**: Ensure travel mode is supported

## Testing Strategy

### 1. Unit Tests
- **GoogleMapsService**: Mock API responses, test algorithms
- **EnhancedItineraryService**: Test integration logic
- **Route Optimization**: Verify TSP algorithm correctness

### 2. Integration Tests
- **API Endpoints**: Test enhanced itinerary generation
- **Error Handling**: Verify fallback behavior
- **Performance**: Ensure response times under 5 seconds

### 3. End-to-End Tests
- **User Flows**: Complete itinerary generation with optimization
- **Cross-browser**: Ensure compatibility across browsers
- **Mobile**: Test responsive design and touch interactions

## Future Enhancements

### 1. Advanced Routing
- **Multiple Route Options**: Show alternative routes
- **Real-time Traffic**: Incorporate current traffic conditions
- **Public Transit**: Detailed transit schedules and connections

### 2. Interactive Maps
- **Embedded Maps**: Show route visualization
- **Drag & Drop**: Allow manual route reordering
- **Street View**: Preview locations before visiting

### 3. Smart Scheduling
- **Opening Hours**: Respect business hours automatically
- **Crowd Levels**: Avoid peak times at popular spots
- **Weather Integration**: Adjust indoor/outdoor activities based on forecast