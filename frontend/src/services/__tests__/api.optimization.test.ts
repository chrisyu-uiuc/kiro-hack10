import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ItineraryOptions, EnhancedItineraryResult, OptimizedItinerary } from '../../types';

// Mock the entire API service module
vi.mock('../api', () => ({
  ApiService: {
    generateOptimizedItinerary: vi.fn(),
  },
}));

// Import after mocking
const { ApiService } = await import('../api');

describe('ApiService - Optimization Integration', () => {
  const mockSessionId = 'test-session-123';
  const mockOptimizedItinerary: OptimizedItinerary = {
    title: 'Optimized Paris Adventure',
    totalDuration: '8 hours',
    totalTravelTime: '45 minutes',
    schedule: [
      {
        time: '09:00',
        spot: 'Eiffel Tower',
        duration: '2 hours',
        transportation: 'Walking',
        notes: 'Great views from the top',
        arrivalTime: '09:00',
        departureTime: '11:00',
        travelTime: '15 mins',
        navigationUrl: 'https://maps.google.com/directions?destination=Eiffel+Tower',
      },
      {
        time: '11:30',
        spot: 'Louvre Museum',
        duration: '3 hours',
        transportation: 'Metro',
        notes: 'Don\'t miss the Mona Lisa',
        arrivalTime: '11:15',
        departureTime: '14:15',
        travelTime: '30 mins',
        navigationUrl: 'https://maps.google.com/directions?destination=Louvre+Museum',
      },
    ],
    route: {
      orderedSpots: ['Eiffel Tower', 'Louvre Museum'],
      totalTravelTime: 2700,
      totalDistance: 3500,
      routeSteps: [
        {
          from: 'Eiffel Tower',
          to: 'Louvre Museum',
          travelTime: {
            duration: 900,
            distance: 1500,
            durationText: '15 mins',
            distanceText: '1.5 km',
          },
          mode: 'walking' as const,
          navigationUrl: 'https://maps.google.com/directions?origin=Eiffel+Tower&destination=Louvre+Museum',
        },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateOptimizedItinerary', () => {
    it('successfully generates optimized itinerary with default options', async () => {
      const mockResult: EnhancedItineraryResult = {
        success: true,
        itinerary: mockOptimizedItinerary,
        fallbackUsed: false,
      };

      vi.mocked(ApiService.generateOptimizedItinerary).mockResolvedValue(mockResult);

      const result = await ApiService.generateOptimizedItinerary(mockSessionId);

      expect(ApiService.generateOptimizedItinerary).toHaveBeenCalledWith(mockSessionId);
      expect(result).toEqual(mockResult);
    });

    it('successfully generates optimized itinerary with custom options', async () => {
      const customOptions: ItineraryOptions = {
        travelMode: 'driving',
        startTime: '10:00',
        visitDuration: 90,
        includeBreaks: false,
      };

      const mockResult: EnhancedItineraryResult = {
        success: true,
        itinerary: mockOptimizedItinerary,
        fallbackUsed: false,
      };

      vi.mocked(ApiService.generateOptimizedItinerary).mockResolvedValue(mockResult);

      const result = await ApiService.generateOptimizedItinerary(mockSessionId, customOptions);

      expect(ApiService.generateOptimizedItinerary).toHaveBeenCalledWith(mockSessionId, customOptions);
      expect(result).toEqual(mockResult);
    });

    it('handles API response with fallback used', async () => {
      const mockResult: EnhancedItineraryResult = {
        success: true,
        itinerary: mockOptimizedItinerary,
        fallbackUsed: true,
      };

      vi.mocked(ApiService.generateOptimizedItinerary).mockResolvedValue(mockResult);

      const result = await ApiService.generateOptimizedItinerary(mockSessionId);

      expect(result.fallbackUsed).toBe(true);
      expect(result.itinerary).toEqual(mockOptimizedItinerary);
    });

    it('handles API error response', async () => {
      const error = new Error('Failed to optimize route');
      vi.mocked(ApiService.generateOptimizedItinerary).mockRejectedValue(error);

      await expect(
        ApiService.generateOptimizedItinerary(mockSessionId)
      ).rejects.toThrow('Failed to optimize route');
    });

    it('handles network errors', async () => {
      const networkError = new Error('Network error. Please check your connection and try again.');
      vi.mocked(ApiService.generateOptimizedItinerary).mockRejectedValue(networkError);

      await expect(
        ApiService.generateOptimizedItinerary(mockSessionId)
      ).rejects.toThrow('Network error. Please check your connection and try again.');
    });

    it('handles empty options object', async () => {
      const mockResult: EnhancedItineraryResult = {
        success: true,
        itinerary: mockOptimizedItinerary,
        fallbackUsed: false,
      };

      vi.mocked(ApiService.generateOptimizedItinerary).mockResolvedValue(mockResult);

      const result = await ApiService.generateOptimizedItinerary(mockSessionId, {});

      expect(ApiService.generateOptimizedItinerary).toHaveBeenCalledWith(mockSessionId, {});
      expect(result.success).toBe(true);
    });

    it('handles partial options object', async () => {
      const partialOptions: ItineraryOptions = {
        travelMode: 'transit',
        includeBreaks: true,
      };

      const mockResult: EnhancedItineraryResult = {
        success: true,
        itinerary: mockOptimizedItinerary,
        fallbackUsed: false,
      };

      vi.mocked(ApiService.generateOptimizedItinerary).mockResolvedValue(mockResult);

      const result = await ApiService.generateOptimizedItinerary(mockSessionId, partialOptions);

      expect(ApiService.generateOptimizedItinerary).toHaveBeenCalledWith(mockSessionId, partialOptions);
      expect(result.success).toBe(true);
    });
  });
});