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
  transportation: string;
  notes: string;
}

export interface AppState {
  currentStep: 'city' | 'spots' | 'itinerary';
  city: string;
  sessionId: string;
  spots: Spot[];
  selectedSpotIds: string[];
  itinerary: Itinerary | null;
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