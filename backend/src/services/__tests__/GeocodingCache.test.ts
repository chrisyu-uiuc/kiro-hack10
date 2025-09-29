/**
 * Tests for GeocodingCache service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GeocodingCache, geocodingCache } from '../GeocodingCache.js';
import { Coordinates } from '../GoogleMapsService.js';

describe('GeocodingCache', () => {
  let cache: GeocodingCache;

  beforeEach(() => {
    cache = GeocodingCache.getInstance();
    cache.clear();
  });

  afterEach(() => {
    cache.clear();
    cache.stopCleanupTimer();
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve coordinates', () => {
      const address = 'Tokyo, Japan';
      const coordinates: Coordinates = { lat: 35.6762, lng: 139.6503 };

      cache.set(address, coordinates);
      const retrieved = cache.get(address);

      expect(retrieved).toEqual(coordinates);
    });

    it('should return null for non-existent addresses', () => {
      const result = cache.get('Non-existent address');
      expect(result).toBeNull();
    });

    it('should check if address exists in cache', () => {
      const address = 'Paris, France';
      const coordinates: Coordinates = { lat: 48.8566, lng: 2.3522 };

      expect(cache.has(address)).toBe(false);
      
      cache.set(address, coordinates);
      expect(cache.has(address)).toBe(true);
    });

    it('should delete entries from cache', () => {
      const address = 'London, UK';
      const coordinates: Coordinates = { lat: 51.5074, lng: -0.1278 };

      cache.set(address, coordinates);
      expect(cache.has(address)).toBe(true);

      const deleted = cache.delete(address);
      expect(deleted).toBe(true);
      expect(cache.has(address)).toBe(false);
    });
  });

  describe('TTL and Expiration', () => {
    it('should expire entries after TTL', async () => {
      const address = 'New York, USA';
      const coordinates: Coordinates = { lat: 40.7128, lng: -74.0060 };
      const shortTtl = 100; // 100ms

      cache.set(address, coordinates, shortTtl);
      expect(cache.has(address)).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(cache.has(address)).toBe(false);
      expect(cache.get(address)).toBeNull();
    });

    it('should not expire entries before TTL', () => {
      const address = 'Sydney, Australia';
      const coordinates: Coordinates = { lat: -33.8688, lng: 151.2093 };
      const longTtl = 60000; // 1 minute

      cache.set(address, coordinates, longTtl);
      expect(cache.has(address)).toBe(true);
      expect(cache.get(address)).toEqual(coordinates);
    });
  });

  describe('Address Normalization', () => {
    it('should normalize addresses consistently', () => {
      const coordinates: Coordinates = { lat: 35.6762, lng: 139.6503 };
      
      cache.set('Tokyo, Japan', coordinates);
      
      // Different formatting should retrieve the same entry
      expect(cache.get('tokyo, japan')).toEqual(coordinates);
      expect(cache.get('  Tokyo,  Japan  ')).toEqual(coordinates);
    });

    it('should handle special characters in addresses', () => {
      const address = 'São Paulo, Brazil!@#';
      const coordinates: Coordinates = { lat: -23.5505, lng: -46.6333 };

      cache.set(address, coordinates);
      const retrieved = cache.get(address);

      expect(retrieved).toEqual(coordinates);
    });
  });

  describe('Cache Statistics', () => {
    it('should track hit and miss counts', () => {
      const address = 'Berlin, Germany';
      const coordinates: Coordinates = { lat: 52.5200, lng: 13.4050 };

      // Initial stats
      let stats = cache.getStats();
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);

      // Miss
      cache.get('Non-existent');
      stats = cache.getStats();
      expect(stats.missCount).toBe(1);

      // Set and hit
      cache.set(address, coordinates);
      cache.get(address);
      stats = cache.getStats();
      expect(stats.hitCount).toBe(1);
    });

    it('should calculate hit rate correctly', () => {
      const address = 'Rome, Italy';
      const coordinates: Coordinates = { lat: 41.9028, lng: 12.4964 };

      cache.set(address, coordinates);
      
      // 2 hits, 1 miss = 66.67% hit rate
      cache.get(address);
      cache.get(address);
      cache.get('Non-existent');

      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(66.67, 1);
    });

    it('should track total entries', () => {
      const addresses = [
        { name: 'Madrid, Spain', coords: { lat: 40.4168, lng: -3.7038 } },
        { name: 'Amsterdam, Netherlands', coords: { lat: 52.3676, lng: 4.9041 } },
        { name: 'Vienna, Austria', coords: { lat: 48.2082, lng: 16.3738 } }
      ];

      addresses.forEach(addr => cache.set(addr.name, addr.coords));

      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(3);
    });
  });

  describe('Cache Cleanup', () => {
    it('should clean up expired entries', async () => {
      const shortTtl = 50; // 50ms
      const addresses = [
        { name: 'Address 1', coords: { lat: 1, lng: 1 } },
        { name: 'Address 2', coords: { lat: 2, lng: 2 } },
        { name: 'Address 3', coords: { lat: 3, lng: 3 } }
      ];

      // Add entries with short TTL
      addresses.forEach(addr => cache.set(addr.name, addr.coords, shortTtl));
      expect(cache.getStats().totalEntries).toBe(3);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Cleanup should remove expired entries
      const removedCount = cache.cleanup();
      expect(removedCount).toBe(3);
      expect(cache.getStats().totalEntries).toBe(0);
    });

    it('should not clean up non-expired entries', () => {
      const longTtl = 60000; // 1 minute
      const address = 'Long-lived address';
      const coordinates: Coordinates = { lat: 1, lng: 1 };

      cache.set(address, coordinates, longTtl);
      expect(cache.getStats().totalEntries).toBe(1);

      const removedCount = cache.cleanup();
      expect(removedCount).toBe(0);
      expect(cache.getStats().totalEntries).toBe(1);
    });
  });

  describe('Cache Size Management', () => {
    it('should evict oldest entries when cache is full', () => {
      // Mock the maxEntries to a small number for testing
      const originalMaxEntries = (cache as any).maxEntries;
      (cache as any).maxEntries = 3;

      try {
        const addresses = [
          { name: 'Address 1', coords: { lat: 1, lng: 1 } },
          { name: 'Address 2', coords: { lat: 2, lng: 2 } },
          { name: 'Address 3', coords: { lat: 3, lng: 3 } }
        ];

        // Add first 3 addresses
        addresses.forEach(addr => cache.set(addr.name, addr.coords));
        expect(cache.getStats().totalEntries).toBe(3);

        // Add 4th address which should trigger eviction
        cache.set('Address 4', { lat: 4, lng: 4 });

        const stats = cache.getStats();
        expect(stats.totalEntries).toBe(3); // Should not exceed max
        
        // First address should be evicted
        expect(cache.has('Address 1')).toBe(false);
        expect(cache.has('Address 4')).toBe(true);
      } finally {
        (cache as any).maxEntries = originalMaxEntries;
      }
    });
  });

  describe('Preloading', () => {
    it('should preload addresses using geocode function', async () => {
      const addresses = ['Tokyo, Japan', 'Paris, France', 'London, UK'];
      const mockGeocode = vi.fn()
        .mockResolvedValueOnce({ lat: 35.6762, lng: 139.6503 })
        .mockResolvedValueOnce({ lat: 48.8566, lng: 2.3522 })
        .mockResolvedValueOnce({ lat: 51.5074, lng: -0.1278 });

      await cache.preload(addresses, mockGeocode);

      expect(mockGeocode).toHaveBeenCalledTimes(3);
      addresses.forEach(address => {
        expect(cache.has(address)).toBe(true);
      });
    });

    it('should skip already cached addresses during preload', async () => {
      const addresses = ['Tokyo, Japan', 'Paris, France'];
      const mockGeocode = vi.fn()
        .mockResolvedValue({ lat: 48.8566, lng: 2.3522 });

      // Pre-cache one address
      cache.set('Tokyo, Japan', { lat: 35.6762, lng: 139.6503 });

      await cache.preload(addresses, mockGeocode);

      // Should only call geocode for the non-cached address
      expect(mockGeocode).toHaveBeenCalledTimes(1);
      expect(mockGeocode).toHaveBeenCalledWith('Paris, France');
    });

    it('should handle geocoding failures during preload', async () => {
      const addresses = ['Valid Address', 'Invalid Address'];
      const mockGeocode = vi.fn()
        .mockResolvedValueOnce({ lat: 1, lng: 1 })
        .mockRejectedValueOnce(new Error('Geocoding failed'));

      // Should not throw error
      await expect(cache.preload(addresses, mockGeocode)).resolves.toBeUndefined();

      // Valid address should be cached
      expect(cache.has('Valid Address')).toBe(true);
      expect(cache.has('Invalid Address')).toBe(false);
    });
  });

  describe('Import/Export', () => {
    it('should export and import cache data', () => {
      const addresses = [
        { name: 'Tokyo, Japan', coords: { lat: 35.6762, lng: 139.6503 } },
        { name: 'Paris, France', coords: { lat: 48.8566, lng: 2.3522 } }
      ];

      addresses.forEach(addr => cache.set(addr.name, addr.coords));

      // Export data
      const exportedData = cache.export();
      expect(exportedData).toBeTruthy();

      // Clear cache and import
      cache.clear();
      expect(cache.getStats().totalEntries).toBe(0);

      const imported = cache.import(exportedData);
      expect(imported).toBe(true);
      expect(cache.getStats().totalEntries).toBe(2);

      // Verify data integrity
      addresses.forEach(addr => {
        expect(cache.get(addr.name)).toEqual(addr.coords);
      });
    });

    it('should handle invalid import data', () => {
      const invalidData = 'invalid json';
      const imported = cache.import(invalidData);
      
      expect(imported).toBe(false);
      expect(cache.getStats().totalEntries).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GeocodingCache.getInstance();
      const instance2 = GeocodingCache.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(geocodingCache);
    });
  });
});