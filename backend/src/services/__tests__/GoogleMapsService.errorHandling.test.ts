/**
 * Google Maps Service Error Handling Tests
 * Tests for comprehensive error handling and logging functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GoogleMapsService, GoogleMapsApiError } from '../GoogleMapsService.js';
import { googleMapsLogger } from '../../utils/googleMapsLogger.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the logger
vi.mock('../../utils/googleMapsLogger.js', () => ({
  googleMapsLogger: {
    logRequest: vi.fn().mockReturnValue('test-request-id'),
    logResponse: vi.fn(),
    logQuotaInfo: vi.fn(),
    getMetrics: vi.fn().mockReturnValue({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      quotaExceededCount: 0,
      rateLimitedCount: 0,
      averageResponseTime: 0,
      lastRequestTime: ''
    }),
    getRecentLogs: vi.fn().mockReturnValue([]),
    getErrorLogs: vi.fn().mockReturnValue([]),
    generateReport: vi.fn().mockReturnValue({
      summary: {},
      recentErrors: [],
      recommendations: []
    }),
    resetMetrics: vi.fn(),
    clearOldLogs: vi.fn()
  }
}));

describe('GoogleMapsService Error Handling', () => {
  let service: GoogleMapsService;

  beforeEach(() => {
    service = new GoogleMapsService('test-api-key');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('API Error Handling', () => {
    it('should handle quota exceeded errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OVER_DAILY_LIMIT',
          error_message: 'Daily quota exceeded'
        })
      });

      await expect(service.geocodeLocation('Tokyo')).rejects.toThrow(GoogleMapsApiError);
      
      try {
        await service.geocodeLocation('Tokyo');
      } catch (error) {
        expect(error).toBeInstanceOf(GoogleMapsApiError);
        expect((error as GoogleMapsApiError).quotaExceeded).toBe(true);
        expect((error as GoogleMapsApiError).statusCode).toBe(429);
        expect((error as GoogleMapsApiError).apiStatus).toBe('OVER_DAILY_LIMIT');
      }
    });

    it('should handle rate limiting errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OVER_QUERY_LIMIT',
          error_message: 'Rate limit exceeded'
        })
      });

      await expect(service.geocodeLocation('Tokyo')).rejects.toThrow(GoogleMapsApiError);
      
      try {
        await service.geocodeLocation('Tokyo');
      } catch (error) {
        expect(error).toBeInstanceOf(GoogleMapsApiError);
        expect((error as GoogleMapsApiError).rateLimited).toBe(true);
        expect((error as GoogleMapsApiError).statusCode).toBe(429);
        expect((error as GoogleMapsApiError).apiStatus).toBe('OVER_QUERY_LIMIT');
      }
    });

    it('should handle request denied errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'REQUEST_DENIED',
          error_message: 'API key invalid'
        })
      });

      await expect(service.geocodeLocation('Tokyo')).rejects.toThrow(GoogleMapsApiError);
      
      try {
        await service.geocodeLocation('Tokyo');
      } catch (error) {
        expect(error).toBeInstanceOf(GoogleMapsApiError);
        expect((error as GoogleMapsApiError).statusCode).toBe(403);
        expect((error as GoogleMapsApiError).apiStatus).toBe('REQUEST_DENIED');
      }
    });

    it('should handle invalid request errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'INVALID_REQUEST',
          error_message: 'Missing required parameters'
        })
      });

      await expect(service.geocodeLocation('Tokyo')).rejects.toThrow(GoogleMapsApiError);
      
      try {
        await service.geocodeLocation('Tokyo');
      } catch (error) {
        expect(error).toBeInstanceOf(GoogleMapsApiError);
        expect((error as GoogleMapsApiError).statusCode).toBe(400);
        expect((error as GoogleMapsApiError).apiStatus).toBe('INVALID_REQUEST');
      }
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error'
      });

      await expect(service.geocodeLocation('Tokyo')).rejects.toThrow(GoogleMapsApiError);
      
      try {
        await service.geocodeLocation('Tokyo');
      } catch (error) {
        expect(error).toBeInstanceOf(GoogleMapsApiError);
        expect((error as GoogleMapsApiError).statusCode).toBe(500);
        expect((error as GoogleMapsApiError).apiStatus).toBe('HTTP_ERROR');
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.geocodeLocation('Tokyo')).rejects.toThrow(GoogleMapsApiError);
      
      try {
        await service.geocodeLocation('Tokyo');
      } catch (error) {
        expect(error).toBeInstanceOf(GoogleMapsApiError);
        expect((error as GoogleMapsApiError).apiStatus).toBe('NETWORK_ERROR');
      }
    });
  });

  describe('Logging Integration', () => {
    it('should log successful requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OK',
          results: [{
            geometry: {
              location: { lat: 35.6762, lng: 139.6503 }
            }
          }]
        })
      });

      await service.geocodeLocation('Tokyo');

      expect(googleMapsLogger.logRequest).toHaveBeenCalledWith(
        'Geocoding API',
        'GET',
        { address: 'Tokyo' }
      );
      expect(googleMapsLogger.logResponse).toHaveBeenCalledWith(
        'test-request-id',
        'OK',
        expect.any(Number)
      );
    });

    it('should log failed requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OVER_DAILY_LIMIT',
          error_message: 'Quota exceeded'
        })
      });

      try {
        await service.geocodeLocation('Tokyo');
      } catch (error) {
        // Expected to throw
      }

      expect(googleMapsLogger.logRequest).toHaveBeenCalled();
      expect(googleMapsLogger.logResponse).toHaveBeenCalledWith(
        'test-request-id',
        'OVER_DAILY_LIMIT',
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('Fallback Behavior', () => {
    it('should return mock coordinates when no API key is provided', async () => {
      const serviceWithoutKey = new GoogleMapsService();
      
      const result = await serviceWithoutKey.geocodeLocation('Tokyo');
      
      expect(result).toBeDefined();
      expect(result?.lat).toBeTypeOf('number');
      expect(result?.lng).toBeTypeOf('number');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return mock travel times when no API key is provided', async () => {
      const serviceWithoutKey = new GoogleMapsService();
      
      const result = await serviceWithoutKey.calculateDistanceMatrix(
        ['Tokyo Station'],
        ['Shibuya'],
        'walking'
      );
      
      expect(result).toBeDefined();
      expect(result[0][0]).toHaveProperty('duration');
      expect(result[0][0]).toHaveProperty('distance');
      expect(result[0][0]).toHaveProperty('durationText');
      expect(result[0][0]).toHaveProperty('distanceText');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should create fallback route steps on API failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service['createRouteStep']('Tokyo', 'Osaka', 'walking');
      
      expect(result).toBeDefined();
      expect(result.from).toBe('Tokyo');
      expect(result.to).toBe('Osaka');
      expect(result.mode).toBe('walking');
      expect(result.travelTime.durationText).toBe('15 mins');
      expect(result.navigationUrl).toContain('google.com/maps');
    });
  });

  describe('Route Optimization Error Handling', () => {
    it('should handle distance matrix failures in route optimization', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OVER_DAILY_LIMIT'
        })
      });

      await expect(service.optimizeRoute(['Tokyo', 'Osaka', 'Kyoto'], 'walking'))
        .rejects.toThrow(GoogleMapsApiError);
    });

    it('should handle route optimization with minimal spots', async () => {
      const result = await service.optimizeRoute(['Tokyo'], 'walking');
      
      expect(result.orderedSpots).toEqual(['Tokyo']);
      expect(result.routeSteps).toHaveLength(0);
      expect(result.totalTravelTime).toBe(0);
      expect(result.totalDistance).toBe(0);
    });

    it('should handle route optimization with two spots', async () => {
      // Mock successful distance matrix call for route step creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OK',
          rows: [{
            elements: [{
              duration: { value: 1800, text: '30 mins' },
              distance: { value: 2000, text: '2.0 km' }
            }]
          }]
        })
      });

      const result = await service.optimizeRoute(['Tokyo', 'Osaka'], 'walking');
      
      expect(result.orderedSpots).toEqual(['Tokyo', 'Osaka']);
      expect(result.routeSteps).toHaveLength(1);
      expect(result.routeSteps[0].from).toBe('Tokyo');
      expect(result.routeSteps[0].to).toBe('Osaka');
    });
  });

  describe('Transit Time Calculation', () => {
    it('should fallback to Distance Matrix when Routes API fails', async () => {
      // Mock geocoding calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'OK',
            results: [{ geometry: { location: { lat: 35.6762, lng: 139.6503 } } }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'OK',
            results: [{ geometry: { location: { lat: 34.6937, lng: 135.5023 } } }]
          })
        })
        // Mock Routes API failure
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            routes: []
          })
        })
        // Mock Distance Matrix fallback success
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'OK',
            rows: [{
              elements: [{
                duration: { value: 3600, text: '1 hour' },
                distance: { value: 5000, text: '5.0 km' }
              }]
            }]
          })
        });

      const result = await service['calculateRouteTime']('Tokyo', 'Osaka', 'transit');
      
      expect(result).toBeDefined();
      expect(result.duration).toBe(3600);
      expect(result.distance).toBe(5000);
    });
  });
});