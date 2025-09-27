export interface Spot {
  id: string;
  name: string;
  category: string;
  location: string;
  description: string;
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