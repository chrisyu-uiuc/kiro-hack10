/**
 * Google Maps Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoogleMapsService, GoogleMapsApiError } from '../GoogleMapsService.js';

// Mock fetch globally
global.fetch = vi.fn();

// Mock console methods to avoid noise in tests
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

vi.stubGlobal('console', mockConsole);

describe('GoogleMapsService', () => {
  let service: GoogleMapsService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    mockConsole.log.mockClear();
    mockConsole.warn.mockClear();
    mockConsole.error.mockClear();
    service = new GoogleMapsService(mockApiKey);
  });

  describe('constructor', () => {
    it('should initialize without API key and log warning', () => {
      const serviceWithoutKey = new GoogleMapsService('');
      expect(serviceWithoutKey).toBeDefined();
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('Google Maps API key not provided - service will use fallback behavior'),
        ''
      );
    });

    it('should initialize with API key and log info', () => {
      expect(service).toBeDefined();
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('Google Maps Service initialized with API key'),
        ''
      );
    });
  });

  describe('geocodeLocation', () => {
    it('should return coordinates for valid address', async () => {
      const mockResponse = {
        status: 'OK',
        results: [{
          geometry: {
            location: { lat: 40.7128, lng: -74.0060 }
          }
        }]
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.geocodeLocation('New York, NY');
      
      expect(result).toEqual({ lat: 40.7128, lng: -74.0060 });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('maps.googleapis.com/maps/api/geocode/json')
      );
    });

    it('should return null for invalid address', async () => {
      const mockResponse = { status: 'OK', results: [] }; // Change to OK with empty results

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.geocodeLocation('Invalid Address');
      expect(result).toBeNull();
    });
  });

  describe('optimizeRoute', () => {
    it('should return spots in same order for 2 or fewer spots', async () => {
      const spots = ['Spot A', 'Spot B'];
      
      // Mock distance matrix call
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'OK',
          rows: [{
            elements: [{
              duration: { value: 600, text: '10 mins' },
              distance: { value: 800, text: '0.8 km' }
            }]
          }]
        })
      });

      const result = await service.optimizeRoute(spots);
      
      expect(result.orderedSpots).toEqual(spots);
      expect(result.routeSteps).toHaveLength(1);
    });

    it('should handle single spot', async () => {
      const spots = ['Single Spot'];
      const result = await service.optimizeRoute(spots);
      
      expect(result.orderedSpots).toEqual(spots);
      expect(result.routeSteps).toHaveLength(0);
      expect(result.totalTravelTime).toBe(0);
    });

    it('should optimize route for 3 spots using nearest neighbor algorithm', async () => {
      const spots = ['Spot A', 'Spot B', 'Spot C'];
      
      // Mock distance matrix - A is closest to B, B is closest to C
      const mockDistanceMatrix = {
        status: 'OK',
        rows: [
          { // From Spot A
            elements: [
              { duration: { value: 0, text: '0 mins' }, distance: { value: 0, text: '0 m' } }, // A to A
              { duration: { value: 300, text: '5 mins' }, distance: { value: 400, text: '0.4 km' } }, // A to B
              { duration: { value: 900, text: '15 mins' }, distance: { value: 1200, text: '1.2 km' } } // A to C
            ]
          },
          { // From Spot B
            elements: [
              { duration: { value: 300, text: '5 mins' }, distance: { value: 400, text: '0.4 km' } }, // B to A
              { duration: { value: 0, text: '0 mins' }, distance: { value: 0, text: '0 m' } }, // B to B
              { duration: { value: 600, text: '10 mins' }, distance: { value: 800, text: '0.8 km' } } // B to C
            ]
          },
          { // From Spot C
            elements: [
              { duration: { value: 900, text: '15 mins' }, distance: { value: 1200, text: '1.2 km' } }, // C to A
              { duration: { value: 600, text: '10 mins' }, distance: { value: 800, text: '0.8 km' } }, // C to B
              { duration: { value: 0, text: '0 mins' }, distance: { value: 0, text: '0 m' } } // C to C
            ]
          }
        ]
      };

      // Mock the distance matrix call and subsequent route step calls
      (fetch as any)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockDistanceMatrix) })
        .mockResolvedValueOnce({ // A to B
          ok: true,
          json: () => Promise.resolve({
            status: 'OK',
            rows: [{ elements: [{ duration: { value: 300, text: '5 mins' }, distance: { value: 400, text: '0.4 km' } }] }]
          })
        })
        .mockResolvedValueOnce({ // B to C
          ok: true,
          json: () => Promise.resolve({
            status: 'OK',
            rows: [{ elements: [{ duration: { value: 600, text: '10 mins' }, distance: { value: 800, text: '0.8 km' } }] }]
          })
        });

      const result = await service.optimizeRoute(spots);
      
      expect(result.orderedSpots).toEqual(['Spot A', 'Spot B', 'Spot C']);
      expect(result.routeSteps).toHaveLength(2);
      expect(result.totalTravelTime).toBe(900); // 300 + 600
      expect(result.totalDistance).toBe(1200); // 400 + 800
    });

    it('should optimize route for 5 spots', async () => {
      const spots = ['A', 'B', 'C', 'D', 'E'];
      
      // Create a mock distance matrix where optimal route is A->B->C->D->E
      const createMockMatrix = () => ({
        status: 'OK',
        rows: spots.map((_, fromIndex) => ({
          elements: spots.map((_, toIndex) => {
            if (fromIndex === toIndex) {
              return { duration: { value: 0, text: '0 mins' }, distance: { value: 0, text: '0 m' } };
            }
            // Make sequential spots closer to each other
            const distance = Math.abs(fromIndex - toIndex) * 300 + 200;
            return {
              duration: { value: distance, text: `${Math.ceil(distance/60)} mins` },
              distance: { value: distance * 1.5, text: `${(distance * 1.5 / 1000).toFixed(1)} km` }
            };
          })
        }))
      });

      // Mock all the API calls
      (fetch as any)
        .mockResolvedValue({ ok: true, json: () => Promise.resolve(createMockMatrix()) });

      const result = await service.optimizeRoute(spots);
      
      expect(result.orderedSpots).toHaveLength(5);
      expect(result.routeSteps).toHaveLength(4);
      expect(result.totalTravelTime).toBeGreaterThan(0);
      expect(result.totalDistance).toBeGreaterThan(0);
    });

    it('should handle different travel modes', async () => {
      const spots = ['Spot A', 'Spot B'];
      
      const mockResponse = {
        status: 'OK',
        rows: [{
          elements: [{
            duration: { value: 1200, text: '20 mins' },
            distance: { value: 2000, text: '2.0 km' }
          }]
        }]
      };

      (fetch as any).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) });

      const walkingResult = await service.optimizeRoute(spots, 'walking');
      expect(walkingResult.routeSteps[0].mode).toBe('walking');

      const drivingResult = await service.optimizeRoute(spots, 'driving');
      expect(drivingResult.routeSteps[0].mode).toBe('driving');

      const transitResult = await service.optimizeRoute(spots, 'transit');
      expect(transitResult.routeSteps[0].mode).toBe('transit');
    });

    it('should handle API errors during route optimization', async () => {
      const spots = ['Spot A', 'Spot B', 'Spot C'];
      
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'OVER_QUERY_LIMIT',
          error_message: 'Rate limit exceeded'
        })
      });

      // The optimizeRoute method catches and re-throws as OPTIMIZATION_ERROR
      await expect(service.optimizeRoute(spots)).rejects.toThrow(GoogleMapsApiError);
      await expect(service.optimizeRoute(spots)).rejects.toThrow('Route optimization failed');
    });

    it('should handle network errors during route optimization', async () => {
      const spots = ['Spot A', 'Spot B', 'Spot C']; // Use 3 spots to trigger optimization
      
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(service.optimizeRoute(spots)).rejects.toThrow(GoogleMapsApiError);
      await expect(service.optimizeRoute(spots)).rejects.toThrow('Route optimization failed');
    });
  });

  describe('generateSchedule', () => {
    it('should generate proper schedule with timing', () => {
      const mockRoute = {
        orderedSpots: ['Spot A', 'Spot B', 'Spot C'],
        totalTravelTime: 1800, // 30 minutes
        totalDistance: 2000,
        routeSteps: [
          {
            from: 'Spot A',
            to: 'Spot B',
            travelTime: { duration: 600, distance: 800, durationText: '10 mins', distanceText: '0.8 km' },
            mode: 'walking' as const,
            navigationUrl: 'https://maps.google.com/...'
          },
          {
            from: 'Spot B',
            to: 'Spot C',
            travelTime: { duration: 900, distance: 1200, durationText: '15 mins', distanceText: '1.2 km' },
            mode: 'walking' as const,
            navigationUrl: 'https://maps.google.com/...'
          }
        ]
      };

      const schedule = service.generateSchedule(mockRoute, '09:00', 60);
      
      expect(schedule).toHaveLength(3);
      expect(schedule[0].time).toBe('09:00');
      expect(schedule[0].spot).toBe('Spot A');
      expect(schedule[0].duration).toBe('60 mins');
      
      // Check that travel time is added between spots
      expect(schedule[1].time).toBe('10:10'); // 09:00 + 60 mins + 10 mins travel
      expect(schedule[2].time).toBe('11:25'); // 10:10 + 60 mins + 15 mins travel
    });

    it('should generate schedule with different start times', () => {
      const mockRoute = {
        orderedSpots: ['Spot A', 'Spot B'],
        totalTravelTime: 600,
        totalDistance: 800,
        routeSteps: [{
          from: 'Spot A',
          to: 'Spot B',
          travelTime: { duration: 600, distance: 800, durationText: '10 mins', distanceText: '0.8 km' },
          mode: 'walking' as const,
          navigationUrl: 'https://maps.google.com/...'
        }]
      };

      const morningSchedule = service.generateSchedule(mockRoute, '08:30', 45);
      expect(morningSchedule[0].time).toBe('08:30');
      expect(morningSchedule[1].time).toBe('09:25'); // 08:30 + 45 mins + 10 mins travel

      const afternoonSchedule = service.generateSchedule(mockRoute, '14:15', 90);
      expect(afternoonSchedule[0].time).toBe('14:15');
      expect(afternoonSchedule[1].time).toBe('15:55'); // 14:15 + 90 mins + 10 mins travel
    });

    it('should generate schedule with different visit durations', () => {
      const mockRoute = {
        orderedSpots: ['Museum', 'Park'],
        totalTravelTime: 900,
        totalDistance: 1200,
        routeSteps: [{
          from: 'Museum',
          to: 'Park',
          travelTime: { duration: 900, distance: 1200, durationText: '15 mins', distanceText: '1.2 km' },
          mode: 'walking' as const,
          navigationUrl: 'https://maps.google.com/...'
        }]
      };

      const shortVisits = service.generateSchedule(mockRoute, '10:00', 30);
      expect(shortVisits[0].duration).toBe('30 mins');
      expect(shortVisits[1].time).toBe('10:45'); // 10:00 + 30 mins + 15 mins travel

      const longVisits = service.generateSchedule(mockRoute, '10:00', 120);
      expect(longVisits[0].duration).toBe('120 mins');
      expect(longVisits[1].time).toBe('12:15'); // 10:00 + 120 mins + 15 mins travel
    });

    it('should include transportation and navigation information', () => {
      const mockRoute = {
        orderedSpots: ['Start', 'End'],
        totalTravelTime: 1200,
        totalDistance: 1500,
        routeSteps: [{
          from: 'Start',
          to: 'End',
          travelTime: { duration: 1200, distance: 1500, durationText: '20 mins', distanceText: '1.5 km' },
          mode: 'driving' as const,
          navigationUrl: 'https://www.google.com/maps/dir/?api=1&origin=Start&destination=End&travelmode=driving'
        }]
      };

      const schedule = service.generateSchedule(mockRoute, '11:00', 60);
      
      expect(schedule[0].transportation).toBe('Driving');
      expect(schedule[0].travelTime).toBe('20 mins');
      expect(schedule[0].navigationUrl).toContain('google.com/maps');
      expect(schedule[0].notes).toContain('Travel to next location: 20 mins');
    });

    it('should handle schedule with no route steps (single spot)', () => {
      const mockRoute = {
        orderedSpots: ['Single Location'],
        totalTravelTime: 0,
        totalDistance: 0,
        routeSteps: []
      };

      const schedule = service.generateSchedule(mockRoute, '12:00', 90);
      
      expect(schedule).toHaveLength(1);
      expect(schedule[0].time).toBe('12:00');
      expect(schedule[0].spot).toBe('Single Location');
      expect(schedule[0].duration).toBe('90 mins');
      expect(schedule[0].transportation).toBeUndefined();
      expect(schedule[0].travelTime).toBeUndefined();
    });

    it('should handle time overflow past midnight', () => {
      const mockRoute = {
        orderedSpots: ['Late Spot A', 'Late Spot B'],
        totalTravelTime: 3600, // 1 hour
        totalDistance: 5000,
        routeSteps: [{
          from: 'Late Spot A',
          to: 'Late Spot B',
          travelTime: { duration: 3600, distance: 5000, durationText: '1 hour', distanceText: '5.0 km' },
          mode: 'transit' as const,
          navigationUrl: 'https://maps.google.com/...'
        }]
      };

      const schedule = service.generateSchedule(mockRoute, '23:30', 120); // Start at 11:30 PM
      
      expect(schedule[0].time).toBe('23:30');
      expect(schedule[1].time).toBe('02:30'); // Next day at 2:30 AM (23:30 + 120 mins + 60 mins travel)
    });
  });

  describe('calculateDistanceMatrix', () => {
    it('should calculate distance matrix for multiple origins and destinations', async () => {
      const mockResponse = {
        status: 'OK',
        rows: [
          {
            elements: [
              { duration: { value: 300, text: '5 mins' }, distance: { value: 400, text: '0.4 km' } },
              { duration: { value: 600, text: '10 mins' }, distance: { value: 800, text: '0.8 km' } }
            ]
          },
          {
            elements: [
              { duration: { value: 450, text: '7.5 mins' }, distance: { value: 600, text: '0.6 km' } },
              { duration: { value: 750, text: '12.5 mins' }, distance: { value: 1000, text: '1.0 km' } }
            ]
          }
        ]
      };

      (fetch as any).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockResponse) });

      const result = await service.calculateDistanceMatrix(
        ['Origin A', 'Origin B'],
        ['Dest A', 'Dest B'],
        'walking'
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(2);
      expect(result[0][0].duration).toBe(300);
      expect(result[0][0].durationText).toBe('5 mins');
      expect(result[1][1].distance).toBe(1000);
    });

    it('should handle missing duration or distance data', async () => {
      const mockResponse = {
        status: 'OK',
        rows: [{
          elements: [{
            // Missing duration and distance (e.g., no route found)
          }]
        }]
      };

      (fetch as any).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockResponse) });

      const result = await service.calculateDistanceMatrix(['A'], ['B']);

      expect(result[0][0].duration).toBe(0);
      expect(result[0][0].distance).toBe(0);
      expect(result[0][0].durationText).toBe('0 mins');
      expect(result[0][0].distanceText).toBe('0 m');
    });

    it('should handle API errors in distance matrix calculation', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          status: 'INVALID_REQUEST',
          error_message: 'Invalid origins or destinations'
        })
      });

      await expect(
        service.calculateDistanceMatrix(['Invalid'], ['Invalid'])
      ).rejects.toThrow(GoogleMapsApiError);
    });

    it('should handle network errors in distance matrix calculation', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network timeout'));

      await expect(
        service.calculateDistanceMatrix(['A'], ['B'])
      ).rejects.toThrow(GoogleMapsApiError);
    });
  });

  describe('createOptimizedItinerary', () => {
    it('should create complete optimized itinerary', async () => {
      const spots = ['Museum', 'Park', 'Restaurant'];
      
      // Mock distance matrix
      const mockDistanceMatrix = {
        status: 'OK',
        rows: [
          { elements: [
            { duration: { value: 0, text: '0 mins' }, distance: { value: 0, text: '0 m' } },
            { duration: { value: 600, text: '10 mins' }, distance: { value: 800, text: '0.8 km' } },
            { duration: { value: 1200, text: '20 mins' }, distance: { value: 1600, text: '1.6 km' } }
          ]},
          { elements: [
            { duration: { value: 600, text: '10 mins' }, distance: { value: 800, text: '0.8 km' } },
            { duration: { value: 0, text: '0 mins' }, distance: { value: 0, text: '0 m' } },
            { duration: { value: 900, text: '15 mins' }, distance: { value: 1200, text: '1.2 km' } }
          ]},
          { elements: [
            { duration: { value: 1200, text: '20 mins' }, distance: { value: 1600, text: '1.6 km' } },
            { duration: { value: 900, text: '15 mins' }, distance: { value: 1200, text: '1.2 km' } },
            { duration: { value: 0, text: '0 mins' }, distance: { value: 0, text: '0 m' } }
          ]}
        ]
      };

      // Mock route step calls
      (fetch as any)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockDistanceMatrix) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({
          status: 'OK',
          rows: [{ elements: [{ duration: { value: 600, text: '10 mins' }, distance: { value: 800, text: '0.8 km' } }] }]
        })})
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({
          status: 'OK',
          rows: [{ elements: [{ duration: { value: 900, text: '15 mins' }, distance: { value: 1200, text: '1.2 km' } }] }]
        })});

      const itinerary = await service.createOptimizedItinerary(spots, 'Tokyo', 'walking', '09:00');

      expect(itinerary.title).toBe('Optimized Tokyo Itinerary');
      expect(itinerary.schedule).toHaveLength(3);
      expect(itinerary.route.orderedSpots).toHaveLength(3);
      expect(itinerary.totalDuration).toContain('h'); // Should include hours
      expect(itinerary.totalTravelTime).toContain('m'); // Should include minutes
    });

    it('should handle errors in itinerary creation', async () => {
      const spots = ['A', 'B', 'C']; // Use 3 spots to trigger optimization
      
      (fetch as any).mockRejectedValueOnce(new Error('API failure'));

      await expect(
        service.createOptimizedItinerary(spots, 'TestCity')
      ).rejects.toThrow(GoogleMapsApiError);
    });
  });

  describe('Error Handling', () => {
    describe('GoogleMapsApiError', () => {
      it('should create error with correct properties', () => {
        const error = new GoogleMapsApiError('Test error', 'OVER_QUERY_LIMIT', 429);
        
        expect(error.name).toBe('GoogleMapsApiError');
        expect(error.message).toBe('Test error');
        expect(error.apiStatus).toBe('OVER_QUERY_LIMIT');
        expect(error.statusCode).toBe(429);
        expect(error.quotaExceeded).toBe(true);
        expect(error.rateLimited).toBe(true);
      });

      it('should identify quota exceeded errors', () => {
        const dailyLimitError = new GoogleMapsApiError('Daily limit', 'OVER_DAILY_LIMIT');
        const queryLimitError = new GoogleMapsApiError('Query limit', 'OVER_QUERY_LIMIT');
        const otherError = new GoogleMapsApiError('Other error', 'INVALID_REQUEST');

        expect(dailyLimitError.quotaExceeded).toBe(true);
        expect(queryLimitError.quotaExceeded).toBe(true);
        expect(otherError.quotaExceeded).toBe(false);
      });

      it('should identify rate limited errors', () => {
        const rateLimitError = new GoogleMapsApiError('Rate limit', 'OVER_QUERY_LIMIT');
        const otherError = new GoogleMapsApiError('Other error', 'OVER_DAILY_LIMIT');

        expect(rateLimitError.rateLimited).toBe(true);
        expect(otherError.rateLimited).toBe(false);
      });
    });

    describe('API Error Responses', () => {
      it('should handle OVER_DAILY_LIMIT error', async () => {
        (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: 'OVER_DAILY_LIMIT',
            error_message: 'Daily quota exceeded'
          })
        });

        await expect(service.geocodeLocation('test')).rejects.toThrow('daily quota exceeded');
      });

      it('should handle REQUEST_DENIED error', async () => {
        (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: 'REQUEST_DENIED',
            error_message: 'API key invalid'
          })
        });

        await expect(service.geocodeLocation('test')).rejects.toThrow('request denied');
      });

      it('should handle UNKNOWN_ERROR', async () => {
        (fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            status: 'UNKNOWN_ERROR'
          })
        });

        await expect(service.geocodeLocation('test')).rejects.toThrow('unknown error');
      });

      it('should handle HTTP errors', async () => {
        (fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve('Server error')
        });

        await expect(service.geocodeLocation('test')).rejects.toThrow('HTTP error');
      });

      it('should handle network errors', async () => {
        (fetch as any).mockRejectedValueOnce(new Error('Network error'));

        await expect(service.geocodeLocation('test')).rejects.toThrow(GoogleMapsApiError);
      });
    });
  });

  describe('Service without API key', () => {
    let serviceWithoutKey: GoogleMapsService;

    beforeEach(() => {
      serviceWithoutKey = new GoogleMapsService('');
    });

    it('should use fallback behavior for geocoding', async () => {
      const result = await serviceWithoutKey.geocodeLocation('Tokyo');
      
      expect(result).not.toBeNull();
      expect(result?.lat).toBeGreaterThan(35);
      expect(result?.lat).toBeLessThan(36);
      expect(result?.lng).toBeGreaterThan(139);
      expect(result?.lng).toBeLessThan(140);
    });

    it('should use fallback behavior for distance matrix', async () => {
      const result = await serviceWithoutKey.calculateDistanceMatrix(['A'], ['B']);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].duration).toBeGreaterThan(0);
      expect(result[0][0].distance).toBeGreaterThan(0);
    });
  });
});