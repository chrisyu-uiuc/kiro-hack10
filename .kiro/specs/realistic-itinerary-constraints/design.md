# Design Document

## Overview

The Realistic Itinerary Enhancement improves the existing Travel Itinerary Generator by modifying the AWS Bedrock Agent prompts and response processing to include realistic timing, travel logistics, and practical scheduling. The enhancement works within the existing architecture without requiring UI changes, focusing on backend improvements to generate more practical and actionable itineraries.

## Architecture

### Current System Enhancement Points

```
Existing Flow:
User Input → Spot Selection → Itinerary Generation → Display

Enhanced Points:
1. Enhanced Bedrock Agent Prompts (more detailed instructions)
2. Improved Response Processing (parse timing and logistics)
3. Enhanced Display Formatting (show realistic schedule)
```

### Technology Stack (No Changes)

The enhancement uses the existing technology stack:
- **Frontend**: React with TypeScript (existing components)
- **Backend**: Node.js with Express (existing API endpoints)
- **AWS**: Bedrock Agent Runtime (enhanced prompts)
- **Storage**: In-memory session storage (existing)

## Components and Interfaces

### Enhanced Backend Components

#### 1. BedrockAgentService Enhancements
```typescript
class BedrockAgentService {
  // Enhanced method with realistic timing prompts
  async generateRealisticItinerary(
    selectedSpots: Spot[], 
    sessionId: string
  ): Promise<RealisticItinerary>
  
  // New helper method for enhanced prompting
  private buildRealisticPrompt(spots: Spot[]): string
  
  // Enhanced response parsing
  private parseRealisticResponse(response: string): RealisticItinerary
}
```

#### 2. Enhanced API Response Format
```typescript
interface RealisticItinerary {
  title: string;
  totalDuration: string;
  schedule: RealisticScheduleItem[];
}

interface RealisticScheduleItem {
  startTime: string;        // "9:00 AM"
  endTime: string;          // "10:30 AM"
  activity: string;         // Spot name
  duration: string;         // "1.5 hours"
  location: string;         // Address or area
  travelToNext?: {
    method: string;         // "walking", "metro", "bus"
    duration: string;       // "15 minutes"
    instructions: string;   // "Walk south on Main St"
  };
  notes?: string;          // Additional tips or info
}
```

### Frontend Component Enhancements

#### 1. ItineraryDisplay Component Updates
- Enhanced to display start/end times
- Show travel information between locations
- Display transportation methods and durations
- Include meal breaks and rest periods

#### 2. No New Components Required
The existing three-step flow remains unchanged:
- CityInput (no changes)
- SpotSelection (no changes)  
- ItineraryDisplay (enhanced display only)

## Data Models

### Enhanced Prompt Structure

#### Realistic Itinerary Prompt Template
```
Create a realistic day-by-day itinerary for visiting these locations in [CITY]:
[SELECTED_SPOTS]

Requirements:
1. Include specific start and end times for each activity
2. Allocate realistic visit durations:
   - Museums: 1-2 hours
   - Viewpoints: 30-60 minutes
   - Parks: 2-3 hours
   - Landmarks: 1-1.5 hours
3. Include travel time and method between locations
4. Group nearby attractions together
5. Include meal breaks (lunch 12-1 PM, dinner 6-7 PM)
6. Schedule within 9 AM - 8 PM
7. Add 15-30 minute buffers between activities

Format the response as a detailed schedule with times, durations, and travel instructions.
```

### Response Processing Logic

#### Time Allocation Rules
```typescript
const VISIT_DURATIONS = {
  museum: { min: 60, max: 120 },      // minutes
  viewpoint: { min: 30, max: 60 },
  park: { min: 120, max: 180 },
  landmark: { min: 60, max: 90 },
  restaurant: { min: 60, max: 90 },
  default: { min: 60, max: 90 }
};

const TRAVEL_METHODS = {
  nearby: 'walking',     // < 1km
  medium: 'metro/bus',   // 1-5km  
  far: 'taxi/uber'       // > 5km
};
```

## Error Handling

### Enhanced Error Scenarios

#### 1. Timing Conflicts
- **Issue**: Generated schedule exceeds daily hours
- **Solution**: Redistribute activities across multiple days or reduce activity count

#### 2. Unrealistic Travel Times
- **Issue**: Insufficient time allocated for travel between distant locations
- **Solution**: Add buffer time or reorder activities geographically

#### 3. Parsing Failures
- **Issue**: Bedrock Agent response doesn't match expected format
- **Solution**: Fallback to basic itinerary format with warning message

### Error Handling Implementation
```typescript
class ItineraryValidator {
  validateSchedule(schedule: RealisticScheduleItem[]): ValidationResult {
    // Check for time conflicts
    // Validate travel times
    // Ensure realistic durations
  }
  
  fixScheduleIssues(schedule: RealisticScheduleItem[]): RealisticScheduleItem[] {
    // Auto-correct common timing issues
    // Add missing travel times
    // Redistribute overloaded days
  }
}
```

## Testing Strategy

### Enhanced Testing Areas

#### 1. Prompt Engineering Tests
- Test various spot combinations for realistic scheduling
- Verify time allocation accuracy for different attraction types
- Validate geographic grouping logic

#### 2. Response Parsing Tests
- Test parsing of enhanced Bedrock Agent responses
- Verify handling of malformed timing data
- Test fallback scenarios for parsing failures

#### 3. Integration Tests
- Test complete flow with realistic timing
- Verify UI displays enhanced information correctly
- Test error handling for scheduling conflicts

### Test Data Scenarios
```typescript
const TEST_SCENARIOS = [
  {
    name: "Single Day - 3 Nearby Attractions",
    spots: ["Museum A", "Park B", "Landmark C"],
    expectedDuration: "6-8 hours",
    expectedTravelMethod: "walking"
  },
  {
    name: "Multi Day - 8 Scattered Attractions", 
    spots: ["Attraction 1", "Attraction 2", ...],
    expectedDays: 2,
    expectedTravelMethods: ["walking", "metro", "bus"]
  }
];
```

## Implementation Approach

### Phase 1: Enhanced Prompting
1. Update BedrockAgentService with realistic timing prompts
2. Modify generateItinerary method to use enhanced prompts
3. Test prompt effectiveness with various spot combinations

### Phase 2: Response Processing
1. Implement parsing logic for enhanced response format
2. Add validation and error handling for timing data
3. Create fallback mechanisms for parsing failures

### Phase 3: Display Enhancement
1. Update ItineraryDisplay component to show timing information
2. Add travel information display between activities
3. Include meal breaks and buffer times in the schedule

### Phase 4: Testing and Refinement
1. Test with various city and spot combinations
2. Refine prompts based on response quality
3. Optimize parsing logic for better accuracy

## Security and Performance Considerations

### Security (No Changes Required)
- Existing AWS IAM roles and permissions remain unchanged
- Input validation continues to use existing mechanisms
- No new external API calls or data sources

### Performance Optimizations
- **Prompt Caching**: Cache successful prompt patterns for similar spot types
- **Response Parsing**: Optimize regex patterns for faster parsing
- **Fallback Speed**: Quick fallback to basic format if parsing takes too long

### Monitoring Enhancements
- Track parsing success rates for different response formats
- Monitor average response times for enhanced prompts
- Alert on high failure rates for realistic scheduling

## Backward Compatibility

### Maintaining Existing Functionality
- All existing API endpoints remain unchanged
- Frontend components maintain existing interfaces
- Session storage format remains compatible
- Error responses follow existing patterns

### Graceful Degradation
- If enhanced parsing fails, fall back to original itinerary format
- Display warning message when realistic timing unavailable
- Maintain full functionality even with basic responses