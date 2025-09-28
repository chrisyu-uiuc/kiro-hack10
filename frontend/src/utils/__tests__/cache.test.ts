import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionCache } from '../cache.js';

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

describe('SessionCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  describe('setSpotDetails', () => {
    it('should store spot details with TTL', () => {
      const spotId = 'test-spot-1';
      const data = { name: 'Test Spot', rating: 4.5 };
      const ttl = 30000;

      SessionCache.setSpotDetails(spotId, data, ttl);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        `spot_details_${spotId}`,
        expect.stringContaining('"data":{"name":"Test Spot","rating":4.5}')
      );
    });

    it('should handle storage errors gracefully', () => {
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => {
        SessionCache.setSpotDetails('test', { data: 'test' });
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to cache spot details:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('getSpotDetails', () => {
    it('should retrieve valid cached data', () => {
      const spotId = 'test-spot-1';
      const data = { name: 'Test Spot', rating: 4.5 };
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl: 30000
      };

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(cacheItem));

      const result = SessionCache.getSpotDetails(spotId);

      expect(result).toEqual(data);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith(`spot_details_${spotId}`);
    });

    it('should return null for expired cache', () => {
      const spotId = 'test-spot-1';
      const cacheItem = {
        data: { name: 'Test Spot' },
        timestamp: Date.now() - 60000, // 1 minute ago
        ttl: 30000 // 30 seconds TTL
      };

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(cacheItem));

      const result = SessionCache.getSpotDetails(spotId);

      expect(result).toBeNull();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(`spot_details_${spotId}`);
    });

    it('should return null for non-existent cache', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const result = SessionCache.getSpotDetails('non-existent');

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors gracefully', () => {
      mockSessionStorage.getItem.mockReturnValue('invalid-json');

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = SessionCache.getSpotDetails('test');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to retrieve cached spot details:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('setImageCache', () => {
    it('should cache image blob URL', () => {
      const imageUrl = 'https://example.com/image.jpg';
      const blobUrl = 'blob:https://example.com/123-456';
      const ttl = 30000;

      SessionCache.setImageCache(imageUrl, blobUrl, ttl);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        `image_cache_${btoa(imageUrl)}`,
        expect.stringContaining(`"data":"${blobUrl}"`)
      );
    });
  });

  describe('getImageCache', () => {
    it('should retrieve valid cached image URL', () => {
      const imageUrl = 'https://example.com/image.jpg';
      const blobUrl = 'blob:https://example.com/123-456';
      const cacheItem = {
        data: blobUrl,
        timestamp: Date.now(),
        ttl: 30000
      };

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(cacheItem));

      const result = SessionCache.getImageCache(imageUrl);

      expect(result).toBe(blobUrl);
    });

    it('should return null for expired image cache', () => {
      const imageUrl = 'https://example.com/image.jpg';
      const cacheItem = {
        data: 'blob:url',
        timestamp: Date.now() - 60000,
        ttl: 30000
      };

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(cacheItem));

      const result = SessionCache.getImageCache(imageUrl);

      expect(result).toBeNull();
    });
  });

  describe('clearAll', () => {
    it('should clear all cached data', () => {
      const keys = ['spot_details_1', 'image_cache_abc', 'other_key'];
      Object.defineProperty(mockSessionStorage, 'length', { value: keys.length });
      
      // Mock Object.keys to return our test keys
      const originalKeys = Object.keys;
      Object.keys = vi.fn().mockReturnValue(keys);

      SessionCache.clearAll();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('spot_details_1');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('image_cache_abc');
      expect(mockSessionStorage.removeItem).not.toHaveBeenCalledWith('other_key');

      // Restore original Object.keys
      Object.keys = originalKeys;
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const keys = [
        'spot_details_1',
        'spot_details_2', 
        'image_cache_abc',
        'image_cache_def',
        'other_key'
      ];

      // Mock Object.keys and sessionStorage.getItem
      const originalKeys = Object.keys;
      Object.keys = vi.fn().mockReturnValue(keys);
      
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (keys.includes(key)) {
          return 'test-value';
        }
        return null;
      });

      const stats = SessionCache.getCacheStats();

      expect(stats.spotDetailsCount).toBe(2);
      expect(stats.imageCacheCount).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);

      // Restore original Object.keys
      Object.keys = originalKeys;
    });
  });
});