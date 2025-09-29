/**
 * API Response Types
 * Common TypeScript interfaces for API responses
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface OptimizeItineraryRequest {
  sessionId: string;
  selectedSpots: Array<{
    id: string;
    name: string;
    category?: string;
    location?: string;
    description?: string;
    duration?: string;
  }>;
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

export interface OptimizeItineraryResponse {
  itinerary: any;
  fallbackUsed: boolean;
  sessionId: string;
  city: string;
  spotsCount: number;
  message: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}