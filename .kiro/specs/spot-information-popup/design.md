# Design Document

## Overview

This feature adds detailed information popups for each spot in the travel itinerary application. The implementation integrates Google Places API to fetch comprehensive spot details including photos, reviews, ratings, and practical information. The popup system is designed to be responsive, performant, and user-friendly across all devices.

## Architecture

### Component Architecture

```
SpotSelection Component
├── SpotCard Component (Enhanced)
│   ├── Information Button (New)
│   └── Existing spot display elements
└── SpotInfoPopup Component (New)
    ├── PopupHeader
    ├── PhotoGallery
    ├── SpotDetails
    ├── ReviewsSection
    └── LocationInfo
```

### Service Layer

```
Backend Services
├── GooglePlacesService (New)
│   ├── Place Details API integration
│   ├── Photo fetching
│   └── Error handling
└── Enhanced API Routes
    └── /api/spots/:spotId/details (New)
```

### Data Flow

1. User clicks information button on spot card
2. Frontend opens popup with loading state
3. API call to backend `/api/spots/:spotId/details`
4. Backend calls Google Places API with spot name/location
5. Backend processes and returns structured data
6. Frontend displays comprehensive spot information
7. User can close popup or navigate through photos

## Components and Interfaces

### Frontend Components

#### SpotInfoPopup Component
```typescript
interface SpotInfoPopupProps {
  spot: Spot;
  isOpen: boolean;
  onClose: () => void;
}

interface GooglePlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string;
  rating: number;
  userRatingsTotal: number;
  photos: PlacePhoto[];
  reviews: PlaceReview[];
  openingHours: OpeningHours;
  websiteUri?: string;
  googleMapsUri: string;
  description?: string;
}
```

#### PhotoGallery Component
```typescript
interface PhotoGalleryProps {
  photos: PlacePhoto[];
  altText: string;
}

interface PlacePhoto {
  photoReference: string;
  width: number;
  height: number;
  htmlAttributions: string[];
}
```

#### ReviewsSection Component
```typescript
interface ReviewsSectionProps {
  reviews: PlaceReview[];
  rating: number;
  totalReviews: number;
}

interface PlaceReview {
  authorName: string;
  authorUrl?: string;
  language: string;
  profilePhotoUrl?: string;
  rating: number;
  relativeTimeDescription: string;
  text: string;
  time: number;
}
```

### Backend Services

#### GooglePlacesService
```typescript
class GooglePlacesService {
  private apiKey: string;
  private baseUrl: string;

  async findPlaceByName(name: string, location?: string): Promise<string | null>;
  async getPlaceDetails(placeId: string): Promise<GooglePlaceDetails>;
  async getPlacePhoto(photoReference: string, maxWidth: number): Promise<string>;
  private handleApiError(error: any): never;
}
```

#### API Route Handler
```typescript
interface SpotDetailsRequest {
  spotId: string;
  spotName: string;
  spotLocation?: string;
}

interface SpotDetailsResponse {
  success: boolean;
  data?: GooglePlaceDetails;
  error?: string;
  cached?: boolean;
}
```

## Data Models

### Enhanced Spot Interface
```typescript
interface Spot {
  id: string;
  name: string;
  category: string;
  location: string;
  description: string;
  duration: string;
  // Optional Google Places data (cached)
  placeId?: string;
  googlePlaceDetails?: GooglePlaceDetails;
}
```

### Google Places API Response Models
```typescript
interface OpeningHours {
  openNow: boolean;
  periods: OpeningPeriod[];
  weekdayText: string[];
}

interface OpeningPeriod {
  close?: TimeOfDay;
  open: TimeOfDay;
}

interface TimeOfDay {
  day: number; // 0-6 (Sunday-Saturday)
  time: string; // HHMM format
}
```

## Error Handling

### API Error Scenarios
1. **Google Places API Rate Limiting**
   - Implement exponential backoff
   - Cache successful responses
   - Show user-friendly error message

2. **Place Not Found**
   - Fallback to basic spot information
   - Display message about limited information availability

3. **Network Failures**
   - Retry mechanism with timeout
   - Offline-friendly error messages
   - Graceful degradation to existing spot data

4. **Invalid API Key**
   - Log error for debugging
   - Return fallback response
   - Don't expose API key issues to users

### Frontend Error Handling
```typescript
interface PopupErrorState {
  hasError: boolean;
  errorType: 'network' | 'not-found' | 'rate-limit' | 'unknown';
  message: string;
  canRetry: boolean;
}
```

## Testing Strategy

### Unit Tests
1. **GooglePlacesService Tests**
   - Mock API responses
   - Test error handling scenarios
   - Validate data transformation

2. **Component Tests**
   - SpotInfoPopup rendering
   - PhotoGallery navigation
   - ReviewsSection display
   - Error state handling

3. **Integration Tests**
   - API endpoint functionality
   - End-to-end popup workflow
   - Mobile responsiveness

### Test Data
```typescript
const mockGooglePlaceDetails: GooglePlaceDetails = {
  placeId: 'ChIJ...',
  name: 'Test Museum',
  formattedAddress: '123 Test St, Test City',
  rating: 4.5,
  userRatingsTotal: 1250,
  photos: [mockPhoto1, mockPhoto2],
  reviews: [mockReview1, mockReview2],
  openingHours: mockOpeningHours,
  websiteUri: 'https://testmuseum.com',
  googleMapsUri: 'https://maps.google.com/?cid=...'
};
```

## Performance Considerations

### Caching Strategy
1. **Backend Caching**
   - Redis/memory cache for place details (24 hour TTL)
   - Photo URL caching (7 day TTL)
   - Rate limit protection

2. **Frontend Caching**
   - Session storage for viewed spot details
   - Image lazy loading
   - Debounced API calls

### Optimization Techniques
1. **Photo Loading**
   - Progressive image loading
   - Responsive image sizes
   - WebP format support with fallbacks

2. **API Efficiency**
   - Batch requests where possible
   - Minimal field selection
   - Request deduplication

## Security Considerations

### API Key Management
- Store Google Places API key in environment variables
- Implement server-side API key usage only
- Add request rate limiting and monitoring

### Data Privacy
- No storage of user personal data from reviews
- Comply with Google Places API terms of service
- Implement proper CORS policies

### Input Validation
```typescript
const validateSpotDetailsRequest = (req: Request): SpotDetailsRequest => {
  const { spotId, spotName, spotLocation } = req.body;
  
  if (!spotId || typeof spotId !== 'string') {
    throw new Error('Invalid spot ID');
  }
  
  if (!spotName || typeof spotName !== 'string' || spotName.length > 200) {
    throw new Error('Invalid spot name');
  }
  
  return { spotId, spotName, spotLocation };
};
```

## Mobile Responsiveness

### Popup Design
- Full-screen modal on mobile devices
- Touch-friendly navigation controls
- Swipe gestures for photo gallery
- Proper viewport handling

### Performance on Mobile
- Optimized image sizes for mobile
- Reduced API payload for slower connections
- Progressive enhancement approach

## Implementation Phases

### Phase 1: Core Infrastructure
- Google Places API service setup
- Basic popup component structure
- API endpoint creation

### Phase 2: Rich Content Display
- Photo gallery implementation
- Reviews and ratings display
- Opening hours and contact info

### Phase 3: Enhanced UX
- Mobile optimizations
- Caching implementation
- Error handling refinement

### Phase 4: Polish & Testing
- Comprehensive testing
- Performance optimization
- Accessibility improvements