import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GooglePlacesService, type PlacesApiError } from '../GooglePlacesService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('GooglePlacesService', () => {
  let service: GooglePlacesService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GooglePlacesService(mockApiKey);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided API key', () => {
      const testService = new GooglePlacesService('custom-key');
      expect(testService).toBeInstanceOf(GooglePlacesService);
    });

    it('should use environment variable if no API key provided', () => {
      const originalEnv = process.env.GOOGLE_PLACES_API_KEY;
      process.env.GOOGLE_PLACES_API_KEY = 'env-key';
      
      const testService = new GooglePlacesService();
      expect(testService).toBeInstanceOf(GooglePlacesService);
      
      process.env.GOOGLE_PLACES_API_KEY = originalEnv;
    });

    it('should throw error if no API key available', () => {
      const originalEnv = process.env.GOOGLE_PLACES_API_KEY;
      delete process.env.GOOGLE_PLACES_API_KEY;
      
      expect(() => new GooglePlacesService()).toThrow('Google Places API key is required');
      
      process.env.GOOGLE_PLACES_API_KEY = originalEnv;
    });
  });

  describe('findPlaceByName', () => {
    it('should return place ID for successful search', async () => {
      const mockResponse = {
        status: 'OK',
        candidates: [
          {
            place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
            name: 'Test Museum'
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.findPlaceByName('Test Museum', 'New York');
      
      expect(result).toBe('ChIJN1t_tDeuEmsRUsoyG83frY4');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('findplacefromtext/json')
      );
    });

    it('should return null for zero results', async () => {
      const mockResponse = {
        status: 'ZERO_RESULTS',
        candidates: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.findPlaceByName('Nonexistent Place');
      expect(result).toBeNull();
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        status: 'REQUEST_DENIED',
        error_message: 'Invalid API key'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(service.findPlaceByName('Test')).rejects.toThrow('Places API error: REQUEST_DENIED');
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      });

      await expect(service.findPlaceByName('Test')).rejects.toThrow('HTTP 403: Forbidden');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.findPlaceByName('Test')).rejects.toThrow('Network error: Network error');
    });

    it('should search with location context', async () => {
      const mockResponse = {
        status: 'OK',
        candidates: [{ place_id: 'test-id', name: 'Test Place' }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await service.findPlaceByName('Museum', 'Paris, France');
      
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('input=Museum+Paris');
      expect(callUrl).toContain('France');
    });
  });

  describe('getPlaceDetails', () => {
    const mockPlaceDetailsResponse = {
      status: 'OK',
      result: {
        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        name: 'Test Museum',
        formatted_address: '123 Test St, Test City, TC 12345',
        rating: 4.5,
        user_ratings_total: 1250,
        photos: [
          {
            photo_reference: 'test-photo-ref',
            width: 400,
            height: 300,
            html_attributions: ['<a href="test">Test Attribution</a>']
          }
        ],
        reviews: [
          {
            author_name: 'John Doe',
            author_url: 'https://maps.google.com/user123',
            language: 'en',
            profile_photo_url: 'https://example.com/photo.jpg',
            rating: 5,
            relative_time_description: '2 weeks ago',
            text: 'Great museum!',
            time: 1640995200
          }
        ],
        opening_hours: {
          open_now: true,
          periods: [
            {
              close: { day: 1, time: '1700' },
              open: { day: 1, time: '0900' }
            }
          ],
          weekday_text: ['Monday: 9:00 AM – 5:00 PM']
        },
        website: 'https://testmuseum.com',
        url: 'https://maps.google.com/?cid=123456789',
        editorial_summary: {
          overview: 'A wonderful test museum'
        }
      }
    };

    it('should return detailed place information', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPlaceDetailsResponse)
      });

      const result = await service.getPlaceDetails('ChIJN1t_tDeuEmsRUsoyG83frY4');
      
      expect(result).toEqual({
        placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        name: 'Test Museum',
        formattedAddress: '123 Test St, Test City, TC 12345',
        rating: 4.5,
        userRatingsTotal: 1250,
        photos: [
          {
            photoReference: 'test-photo-ref',
            width: 400,
            height: 300,
            htmlAttributions: ['<a href="test">Test Attribution</a>']
          }
        ],
        reviews: [
          {
            authorName: 'John Doe',
            authorUrl: 'https://maps.google.com/user123',
            language: 'en',
            profilePhotoUrl: 'https://example.com/photo.jpg',
            rating: 5,
            relativeTimeDescription: '2 weeks ago',
            text: 'Great museum!',
            time: 1640995200
          }
        ],
        openingHours: {
          openNow: true,
          periods: [
            {
              close: { day: 1, time: '1700' },
              open: { day: 1, time: '0900' }
            }
          ],
          weekdayText: ['Monday: 9:00 AM – 5:00 PM']
        },
        websiteUri: 'https://testmuseum.com',
        googleMapsUri: 'https://maps.google.com/?cid=123456789',
        description: 'A wonderful test museum'
      });
    });

    it('should handle missing optional fields', async () => {
      const minimalResponse = {
        status: 'OK',
        result: {
          place_id: 'test-id',
          name: 'Minimal Place'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(minimalResponse)
      });

      const result = await service.getPlaceDetails('test-id');
      
      expect(result.placeId).toBe('test-id');
      expect(result.name).toBe('Minimal Place');
      expect(result.formattedAddress).toBe('');
      expect(result.rating).toBe(0);
      expect(result.photos).toEqual([]);
      expect(result.reviews).toEqual([]);
      expect(result.openingHours).toBeUndefined();
    });

    it('should handle NOT_FOUND error', async () => {
      const mockResponse = {
        status: 'NOT_FOUND'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(service.getPlaceDetails('invalid-id')).rejects.toThrow('Place not found');
    });

    it('should handle OVER_QUERY_LIMIT error', async () => {
      const mockResponse = {
        status: 'OVER_QUERY_LIMIT'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(service.getPlaceDetails('test-id')).rejects.toThrow('API quota exceeded');
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(service.getPlaceDetails('test-id')).rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });

  describe('getPlacePhotoUrl', () => {
    it('should generate correct photo URL with default width', () => {
      const photoRef = 'test-photo-reference';
      const url = service.getPlacePhotoUrl(photoRef);
      
      expect(url).toContain('photoreference=test-photo-reference');
      expect(url).toContain('maxwidth=400');
      expect(url).toContain(`key=${mockApiKey}`);
    });

    it('should generate correct photo URL with custom width', () => {
      const photoRef = 'test-photo-reference';
      const url = service.getPlacePhotoUrl(photoRef, 800);
      
      expect(url).toContain('maxwidth=800');
    });
  });

  describe('error handling', () => {
    it('should create PlacesApiError with correct properties', async () => {
      const mockResponse = {
        status: 'INVALID_REQUEST'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      try {
        await service.findPlaceByName('test');
      } catch (error) {
        const placesError = error as PlacesApiError;
        expect(placesError.name).toBe('PlacesApiError');
        expect(placesError.status).toBe('INVALID_REQUEST');
        expect(placesError.message).toContain('INVALID_REQUEST');
      }
    });

    it('should handle rate limiting gracefully', async () => {
      const mockResponse = {
        status: 'OVER_QUERY_LIMIT'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      try {
        await service.getPlaceDetails('test-id');
      } catch (error) {
        const placesError = error as PlacesApiError;
        expect(placesError.message).toContain('API quota exceeded');
        expect(placesError.status).toBe('OVER_QUERY_LIMIT');
      }
    });
  });
});