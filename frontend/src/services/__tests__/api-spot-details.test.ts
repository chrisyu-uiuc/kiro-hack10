import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GooglePlaceDetails } from '../../types';

// Mock axios before importing ApiService
const mockAxiosInstance = {
  post: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  }
};

const mockedAxios = {
  create: vi.fn(() => mockAxiosInstance),
  isAxiosError: vi.fn()
};

vi.mock('axios', () => ({
  default: mockedAxios,
  ...mockedAxios
}));

// Import ApiService after mocking axios
const { ApiService } = await import('../api');

describe('ApiService - Spot Details Core Functionality', () => {
  const mockSpotDetails: GooglePlaceDetails = {
    placeId: 'ChIJ123',
    name: 'Test Museum',
    formattedAddress: '123 Test St, Test City',
    rating: 4.5,
    userRatingsTotal: 1250,
    photos: [
      {
        photoReference: 'photo123',
        width: 400,
        height: 300,
        htmlAttributions: ['Test Attribution']
      }
    ],
    reviews: [
      {
        authorName: 'John Doe',
        language: 'en',
        rating: 5,
        relativeTimeDescription: '2 weeks ago',
        text: 'Great museum!',
        time: 1640995200
      }
    ],
    openingHours: {
      openNow: true,
      periods: [],
      weekdayText: ['Monday: 9:00 AM – 5:00 PM']
    },
    websiteUri: 'https://testmuseum.com',
    googleMapsUri: 'https://maps.google.com/?cid=123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance.post.mockReset();
    ApiService.clearSpotDetailsCache();
  });

  describe('fetchSpotDetails - Basic Functionality', () => {
    it('should successfully fetch spot details', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockSpotDetails
        }
      });

      const result = await ApiService.fetchSpotDetails('spot1', 'Test Museum', 'Test City');

      expect(result).toEqual(mockSpotDetails);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/spots/spot1/details',
        {
          spotName: 'Test Museum',
          spotLocation: 'Test City'
        }
      );
    });

    it('should handle missing optional location parameter', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockSpotDetails
        }
      });

      const result = await ApiService.fetchSpotDetails('spot2', 'Test Museum');

      expect(result).toEqual(mockSpotDetails);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/spots/spot2/details',
        {
          spotName: 'Test Museum',
          spotLocation: undefined
        }
      );
    });

    it('should properly encode spot IDs in URLs', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { success: true, data: mockSpotDetails }
      });

      await ApiService.fetchSpotDetails('spot with spaces', 'Test Museum');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/spots/spot%20with%20spaces/details',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API response errors', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Place not found in Google Places'
        }
      });

      await expect(
        ApiService.fetchSpotDetails('spot3', 'Nonexistent Place')
      ).rejects.toThrow('Place not found in Google Places');
    });

    it('should handle missing data in successful responses', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: null
        }
      });

      await expect(
        ApiService.fetchSpotDetails('spot4', 'Test Museum')
      ).rejects.toThrow('Failed to fetch spot details');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.post.mockRejectedValueOnce(networkError);

      await expect(
        ApiService.fetchSpotDetails('spot5', 'Test Museum')
      ).rejects.toThrow('Network error');
    });
  });

  describe('Request Deduplication', () => {
    it('should deduplicate simultaneous requests for the same spot', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockSpotDetails
        }
      });

      // Make multiple simultaneous requests for the same spot
      const promises = [
        ApiService.fetchSpotDetails('dedup-spot', 'Dedup Museum'),
        ApiService.fetchSpotDetails('dedup-spot', 'Dedup Museum'),
        ApiService.fetchSpotDetails('dedup-spot', 'Dedup Museum')
      ];

      const results = await Promise.all(promises);

      // Should only make one API call
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
      
      // All results should be the same
      results.forEach(result => {
        expect(result).toEqual(mockSpotDetails);
      });
    });

    it('should not deduplicate requests for different spots', async () => {
      mockAxiosInstance.post
        .mockResolvedValueOnce({
          data: { success: true, data: { ...mockSpotDetails, name: 'Museum 1' } }
        })
        .mockResolvedValueOnce({
          data: { success: true, data: { ...mockSpotDetails, name: 'Museum 2' } }
        });

      const promises = [
        ApiService.fetchSpotDetails('spot-a', 'Museum 1'),
        ApiService.fetchSpotDetails('spot-b', 'Museum 2')
      ];

      await Promise.all(promises);

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('Caching', () => {
    it('should cache successful responses', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: true,
          data: mockSpotDetails
        }
      });

      // First request
      const result1 = await ApiService.fetchSpotDetails('cache-spot', 'Cache Museum');
      
      // Second request (should use cache)
      const result2 = await ApiService.fetchSpotDetails('cache-spot', 'Cache Museum');

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(mockSpotDetails);
      expect(result2).toEqual(mockSpotDetails);
    });

    it('should clear cache when requested', async () => {
      mockAxiosInstance.post
        .mockResolvedValueOnce({
          data: { success: true, data: mockSpotDetails }
        })
        .mockResolvedValueOnce({
          data: { success: true, data: { ...mockSpotDetails, rating: 4.8 } }
        });

      // First request
      await ApiService.fetchSpotDetails('clear-spot', 'Clear Museum');

      // Clear cache
      ApiService.clearSpotDetailsCache();

      // Second request (should make new API call)
      const result2 = await ApiService.fetchSpotDetails('clear-spot', 'Clear Museum');

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
      expect(result2.rating).toBe(4.8);
    });
  });

  describe('Cache Statistics', () => {
    it('should provide accurate cache statistics', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, data: mockSpotDetails }
      });

      // Initially empty
      let stats = ApiService.getCacheStats();
      expect(stats.cacheSize).toBe(0);
      expect(stats.pendingRequests).toBe(0);

      // After successful request
      await ApiService.fetchSpotDetails('stats-spot', 'Stats Museum');
      
      stats = ApiService.getCacheStats();
      expect(stats.cacheSize).toBe(1);
      expect(stats.pendingRequests).toBe(0);
    });
  });

  describe('Loading States Management', () => {
    it('should handle concurrent requests properly', async () => {
      let resolvePromise: (value: any) => void;
      const delayedPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockAxiosInstance.post.mockReturnValueOnce(delayedPromise);

      // Start first request
      const promise1 = ApiService.fetchSpotDetails('concurrent-spot', 'Concurrent Museum');
      
      // Start second request (should be deduplicated)
      const promise2 = ApiService.fetchSpotDetails('concurrent-spot', 'Concurrent Museum');

      // Check that there's a pending request
      let stats = ApiService.getCacheStats();
      expect(stats.pendingRequests).toBe(1);

      // Resolve the promise
      resolvePromise!({
        data: { success: true, data: mockSpotDetails }
      });

      // Wait for both promises to complete
      const results = await Promise.all([promise1, promise2]);

      // Check that pending requests are cleared
      stats = ApiService.getCacheStats();
      expect(stats.pendingRequests).toBe(0);
      expect(stats.cacheSize).toBe(1);

      // Both should return the same result
      expect(results[0]).toEqual(mockSpotDetails);
      expect(results[1]).toEqual(mockSpotDetails);
    });
  });
});