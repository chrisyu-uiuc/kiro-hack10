export interface Spot {
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

export interface Itinerary {
  title: string;
  totalDuration: string;
  schedule: ScheduleItem[];
}

export interface ScheduleItem {
  time: string;
  spot: string;
  duration: string;
  transportation?: string;
  notes?: string;
  // Enhanced fields for optimized itineraries
  arrivalTime?: string;
  departureTime?: string;
  travelTime?: string;
  navigationUrl?: string;
}

// Enhanced itinerary types for Google Maps optimization
export interface OptimizedItinerary {
  title: string;
  totalDuration: string;
  totalTravelTime: string;
  schedule: ScheduleItem[];
  route: OptimizedRoute;
}

export interface OptimizedRoute {
  orderedSpots: string[];
  totalTravelTime: number; // in seconds
  totalDistance: number; // in meters
  routeSteps: RouteStep[];
}

export interface RouteStep {
  from: string;
  to: string;
  travelTime: TravelTime;
  mode: TravelMode;
  navigationUrl: string;
}

export interface TravelTime {
  duration: number; // seconds
  distance: number; // meters
  durationText: string; // "15 mins"
  distanceText: string; // "1.2 km"
}

// Travel mode and optimization options
export type TravelMode = 'walking' | 'driving' | 'transit';

export interface ItineraryOptions {
  travelMode?: TravelMode;
  startTime?: string;
  visitDuration?: number; // minutes per spot
  includeBreaks?: boolean;
  multiDay?: boolean;
  hotelLocation?: string;
  dailyStartTime?: string;
  dailyEndTime?: string;
}

export interface AppState {
  currentStep: 'city' | 'spots' | 'itinerary';
  city: string;
  sessionId: string;
  spots: Spot[];
  selectedSpotIds: string[];
  itinerary: Itinerary | null;
  optimizedItinerary: OptimizedItinerary | null;
  loading: boolean;
  loadingMore: boolean;
  loadingItinerary: boolean;
  error: string | null;
  noMoreSpots: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface CityVerificationResponse {
  valid: boolean;
  city: string;
  message: string;
}

export interface SpotGenerationResponse {
  spots: Spot[];
  sessionId: string;
  city: string;
  message: string;
  totalSpots?: number;
  reachedLimit?: boolean;
  noMoreSpots?: boolean;
}

export interface SpotSelectionResponse {
  sessionId: string;
  selectedCount: number;
  selectedSpots: Spot[];
  message: string;
}

export interface ItineraryGenerationResponse {
  sessionId: string;
  city: string;
  itinerary: Itinerary;
  spotsCount: number;
  message: string;
}

export interface OptimizedItineraryResponse {
  sessionId: string;
  city: string;
  itinerary: OptimizedItinerary;
  spotsCount: number;
  message: string;
  fallbackUsed?: boolean;
}

export interface EnhancedItineraryResult {
  success: boolean;
  itinerary?: OptimizedItinerary;
  error?: string;
  fallbackUsed?: boolean;
}

export interface SpotDetailsResponse {
  success: boolean;
  data?: GooglePlaceDetails;
  error?: string;
  cached?: boolean;
}

// Google Places API related interfaces
export interface GooglePlaceDetails {
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

export interface PlacePhoto {
  photoReference: string;
  width: number;
  height: number;
  htmlAttributions: string[];
  photoUrl?: string; // Complete URL with API key
}

export interface PlaceReview {
  authorName: string;
  authorUrl?: string;
  language: string;
  profilePhotoUrl?: string;
  rating: number;
  relativeTimeDescription: string;
  text: string;
  time: number;
}

export interface OpeningHours {
  openNow: boolean;
  periods: OpeningPeriod[];
  weekdayText: string[];
}

export interface OpeningPeriod {
  close?: TimeOfDay;
  open: TimeOfDay;
}

export interface TimeOfDay {
  day: number; // 0-6 (Sunday-Saturday)
  time: string; // HHMM format
}

// Popup error handling interface
export interface PopupErrorState {
  hasError: boolean;
  errorType: 'network' | 'not-found' | 'rate-limit' | 'server-error' | 'timeout' | 'api-key' | 'unknown';
  message: string;
  canRetry: boolean;
  retryAfter?: number; // Seconds to wait before retry (for rate limiting)
  fallbackData?: Partial<GooglePlaceDetails>; // Partial data that might be available
}

// Error handling utilities
export interface ErrorHandlingOptions {
  showFallbackContent: boolean;
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
}