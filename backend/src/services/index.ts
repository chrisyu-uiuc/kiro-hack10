export { BedrockAgentService } from './BedrockAgentService';
export type { Spot, Itinerary, ScheduleItem } from './BedrockAgentService';

export { GooglePlacesService } from './GooglePlacesService';
export type { 
  GooglePlaceDetails, 
  PlacePhoto, 
  PlaceReview, 
  OpeningHours, 
  OpeningPeriod, 
  TimeOfDay,
  PlacesApiError 
} from './GooglePlacesService';

export { GoogleMapsService } from './GoogleMapsService';
export type { 
  Coordinates, 
  TravelTime, 
  RouteStep, 
  OptimizedRoute, 
  OptimizedItinerary 
} from './GoogleMapsService';

export { EnhancedItineraryService } from './EnhancedItineraryService';
export type { 
  ItineraryOptions, 
  EnhancedItineraryResult 
} from './EnhancedItineraryService';