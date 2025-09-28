import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from '../../server.js';

// Set up environment variable for testing
process.env.GOOGLE_PLACES_API_KEY = 'test-api-key';

// Mock the GooglePlacesService module
const mockFindPlaceByName = vi.fn();
const mockGetPlaceDetails = vi.fn();

vi.mock('../../services/GooglePlacesService.js', () => {
  return {
    GooglePlacesService: vi.fn().mockImplementation(() => ({
      findPlaceByName: mockFindPlaceByName,
      getPlaceDetails: mockGetPlaceDetails,
    })),
  };
});

describe('Spot Routes', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    mockFindPlaceByName.mockReset();
    mockGetPlaceDetails.mockReset();
  });

  afterEach(async () => {
    // Clear cache after each test
    await request(app).delete('/api/spots/cache');
  });

  describe('GET /api/spots/:spotId/details', () => {
    const validSpotId = 'test-spot-123';
    const validSpotName = 'Central Park';
    const validSpotLocation = 'New York, NY';

    it('should return spot details successfully', async () => {
      const mockPlaceId = 'ChIJ4zGFAZpYwokRGUGph3Mf37k';
      const mockPlaceDetails = {
        placeId: mockPlaceId,
        name: 'Central Park',
        formattedAddress: 'New York, NY 10024, USA',
        rating: 4.6,
        userRatingsTotal: 150000,
        photos: [
          {
            photoReference: 'test-photo-ref',
            width: 400,
            height: 300,
            htmlAttributions: ['Test Attribution']
          }
        ],
        reviews: [
          {
            authorName: 'John Doe',
            rating: 5,
            text: 'Amazing park!',
            relativeTimeDescription: '2 weeks ago',
            time: 1640995200,
            language: 'en'
          }
        ],
        openingHours: {
          openNow: true,
          periods: [],
          weekdayText: ['Monday: 6:00 AM – 1:00 AM']
        },
        websiteUri: 'https://www.centralparknyc.org',
        googleMapsUri: 'https://maps.google.com/?cid=123456789',
        description: 'A large public park in Manhattan'
      };

      mockFindPlaceByName.mockResolvedValue(mockPlaceId);
      mockGetPlaceDetails.mockResolvedValue(mockPlaceDetails);

      const response = await request(app)
        .get(`/api/spots/${validSpotId}/details`)
        .query({
          spotName: validSpotName,
          spotLocation: validSpotLocation
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        ...mockPlaceDetails,
        spotId: validSpotId,
        dataSource: 'google_places'
      });
      expect(response.body.cached).toBe(false);
      expect(mockFindPlaceByName).toHaveBeenCalledWith(validSpotName, validSpotLocation);
      expect(mockGetPlaceDetails).toHaveBeenCalledWith(mockPlaceId);
    });

    it('should return cached data on subsequent requests', async () => {
      const testSpotName = 'Times Square';
      const testSpotLocation = 'New York, NY';
      const mockPlaceId = 'ChIJ4zGFAZpYwokRGUGph3Mf37k';
      const mockPlaceDetails = {
        placeId: mockPlaceId,
        name: testSpotName,
        formattedAddress: 'New York, NY 10024, USA',
        rating: 4.6,
        userRatingsTotal: 150000,
        photos: [],
        reviews: [],
        googleMapsUri: 'https://maps.google.com/?cid=123456789'
      };

      mockFindPlaceByName.mockResolvedValue(mockPlaceId);
      mockGetPlaceDetails.mockResolvedValue(mockPlaceDetails);

      // First request
      await request(app)
        .get(`/api/spots/${validSpotId}/details`)
        .query({
          spotName: testSpotName,
          spotLocation: testSpotLocation
        });

      // Second request should use cache
      const response = await request(app)
        .get(`/api/spots/${validSpotId}/details`)
        .query({
          spotName: testSpotName,
          spotLocation: testSpotLocation
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.cached).toBe(true);
      expect(mockFindPlaceByName).toHaveBeenCalledTimes(1);
      expect(mockGetPlaceDetails).toHaveBeenCalledTimes(1);
    });

    it('should return fallback data when place is not found', async () => {
      const testSpotName = 'Unknown Place';
      const testSpotLocation = 'Unknown Location';
      
      mockFindPlaceByName.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/spots/${validSpotId}/details`)
        .query({
          spotName: testSpotName,
          spotLocation: testSpotLocation
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.fallback).toBe(true);
      expect(response.body.data).toMatchObject({
        spotId: validSpotId,
        name: testSpotName,
        formattedAddress: testSpotLocation,
        rating: 0,
        userRatingsTotal: 0,
        photos: [],
        reviews: [],
        dataSource: 'fallback'
      });
      expect(response.body.message).toContain('Basic information provided');
    });

    it('should handle rate limit errors', async () => {
      const testSpotName = 'Rate Limited Place';
      const testSpotLocation = 'Test Location';
      const rateLimitError = new Error('API quota exceeded') as any;
      rateLimitError.name = 'PlacesApiError';
      rateLimitError.status = 'OVER_QUERY_LIMIT';

      mockFindPlaceByName.mockRejectedValue(rateLimitError);

      const response = await request(app)
        .get(`/api/spots/${validSpotId}/details`)
        .query({
          spotName: testSpotName,
          spotLocation: testSpotLocation
        });

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.error.message).toContain('rate limit exceeded');
    });

    it('should handle place not found errors with fallback', async () => {
      const testSpotName = 'Not Found Place';
      const testSpotLocation = 'Test Location';
      const notFoundError = new Error('Place not found') as any;
      notFoundError.name = 'PlacesApiError';
      notFoundError.status = 'NOT_FOUND';

      mockFindPlaceByName.mockResolvedValue('test-place-id');
      mockGetPlaceDetails.mockRejectedValue(notFoundError);

      const response = await request(app)
        .get(`/api/spots/${validSpotId}/details`)
        .query({
          spotName: testSpotName,
          spotLocation: testSpotLocation
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.fallback).toBe(true);
      expect(response.body.data.dataSource).toBe('fallback');
    });

    it('should validate required parameters', async () => {
      // Missing spot ID
      const response1 = await request(app)
        .get('/api/spots//details')
        .query({
          spotName: validSpotName,
          spotLocation: validSpotLocation
        });

      expect(response1.status).toBe(404); // Express returns 404 for empty params

      // Missing spot name
      const response2 = await request(app)
        .get(`/api/spots/${validSpotId}/details`)
        .query({
          spotLocation: validSpotLocation
        });

      expect(response2.status).toBe(400);
      expect(response2.body.success).toBe(false);
      expect(response2.body.error.code).toBe('VALIDATION_ERROR');
      expect(response2.body.error.message).toContain('Spot name is required');

      // Empty spot name
      const response3 = await request(app)
        .get(`/api/spots/${validSpotId}/details`)
        .query({
          spotName: '',
          spotLocation: validSpotLocation
        });

      expect(response3.status).toBe(400);
      expect(response3.body.success).toBe(false);
      expect(response3.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle network errors', async () => {
      const testSpotName = 'Network Error Place';
      const testSpotLocation = 'Test Location';
      const networkError = new Error('Network timeout');
      mockFindPlaceByName.mockRejectedValue(networkError);

      const response = await request(app)
        .get(`/api/spots/${validSpotId}/details`)
        .query({
          spotName: testSpotName,
          spotLocation: testSpotLocation
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SPOT_DETAILS_ERROR');
    });
  });

  describe('DELETE /api/spots/cache', () => {
    it('should clear the cache successfully', async () => {
      const response = await request(app)
        .delete('/api/spots/cache');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Cache cleared');
    });
  });

  describe('GET /api/spots/cache/stats', () => {
    it('should return cache statistics', async () => {
      const response = await request(app)
        .get('/api/spots/cache/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalEntries');
      expect(response.body.data).toHaveProperty('validEntries');
      expect(response.body.data).toHaveProperty('expiredEntries');
      expect(response.body.data).toHaveProperty('cacheTtlHours');
      expect(response.body.data.cacheTtlHours).toBe(24);
    });
  });
});