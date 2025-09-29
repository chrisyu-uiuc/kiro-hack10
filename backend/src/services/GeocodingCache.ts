/**
 * Geocoding Cache Service
 * Implements caching for Google Maps geocoding results to reduce API calls and improve performance
 */

import { Coordinates } from './GoogleMapsService.js';

interface CacheEntry {
  coordinates: Coordinates;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  memoryUsage: number;
}

export class GeocodingCache {
  private static instance: GeocodingCache;
  private cache = new Map<string, CacheEntry>();
  private hitCount = 0;
  private missCount = 0;
  private readonly defaultTtl = 24 * 60 * 60 * 1000; // 24 hours
  private readonly maxEntries = 1000; // Limit cache size
  private readonly cleanupInterval = 60 * 60 * 1000; // Cleanup every hour
  private cleanupTimer?: NodeJS.Timeout;

  private constructor() {
    this.startCleanupTimer();
  }

  public static getInstance(): GeocodingCache {
    if (!GeocodingCache.instance) {
      GeocodingCache.instance = new GeocodingCache();
    }
    return GeocodingCache.instance;
  }

  /**
   * Get coordinates from cache
   */
  get(address: string): Coordinates | null {
    const key = this.normalizeAddress(address);
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    console.log(`🎯 [GeocodingCache] Cache hit for: ${address}`);
    return entry.coordinates;
  }

  /**
   * Store coordinates in cache
   */
  set(address: string, coordinates: Coordinates, ttl?: number): void {
    const key = this.normalizeAddress(address);
    const entry: CacheEntry = {
      coordinates,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl
    };

    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxEntries) {
      this.evictOldestEntry();
    }

    this.cache.set(key, entry);
    console.log(`💾 [GeocodingCache] Cached coordinates for: ${address}`);
  }

  /**
   * Check if address is cached
   */
  has(address: string): boolean {
    const key = this.normalizeAddress(address);
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Remove entry from cache
   */
  delete(address: string): boolean {
    const key = this.normalizeAddress(address);
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    console.log('🧹 [GeocodingCache] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
    
    // Estimate memory usage (rough calculation)
    const memoryUsage = this.cache.size * 200; // ~200 bytes per entry estimate

    return {
      totalEntries: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate,
      memoryUsage
    };
  }

  /**
   * Get cache entries for debugging
   */
  getEntries(): Array<{ address: string; coordinates: Coordinates; age: number }> {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([address, entry]) => ({
      address,
      coordinates: entry.coordinates,
      age: now - entry.timestamp
    }));
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`🧹 [GeocodingCache] Cleaned up ${removedCount} expired entries`);
    }

    return removedCount;
  }

  /**
   * Preload common addresses (useful for popular destinations)
   */
  async preload(addresses: string[], geocodeFunction: (address: string) => Promise<Coordinates | null>): Promise<void> {
    console.log(`🚀 [GeocodingCache] Preloading ${addresses.length} addresses`);
    
    const promises = addresses.map(async (address) => {
      if (!this.has(address)) {
        try {
          const coordinates = await geocodeFunction(address);
          if (coordinates) {
            this.set(address, coordinates);
          }
        } catch (error) {
          console.warn(`⚠️ [GeocodingCache] Failed to preload ${address}:`, error);
        }
      }
    });

    await Promise.all(promises);
    console.log(`✅ [GeocodingCache] Preloading completed`);
  }

  /**
   * Export cache data for persistence
   */
  export(): string {
    const data = {
      entries: Array.from(this.cache.entries()),
      stats: {
        hitCount: this.hitCount,
        missCount: this.missCount
      },
      timestamp: Date.now()
    };
    return JSON.stringify(data);
  }

  /**
   * Import cache data from persistence
   */
  import(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      
      // Validate data structure
      if (!parsed.entries || !Array.isArray(parsed.entries)) {
        throw new Error('Invalid cache data format');
      }

      this.cache.clear();
      
      // Import entries
      for (const [key, entry] of parsed.entries) {
        if (this.isValidCacheEntry(entry)) {
          this.cache.set(key, entry);
        }
      }

      // Import stats if available
      if (parsed.stats) {
        this.hitCount = parsed.stats.hitCount || 0;
        this.missCount = parsed.stats.missCount || 0;
      }

      console.log(`📥 [GeocodingCache] Imported ${this.cache.size} cache entries`);
      return true;
    } catch (error) {
      console.error('❌ [GeocodingCache] Failed to import cache data:', error);
      return false;
    }
  }

  /**
   * Normalize address for consistent caching
   */
  private normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s,.-]/g, ''); // Remove special characters except common ones
  }

  /**
   * Evict oldest entry when cache is full
   */
  private evictOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ [GeocodingCache] Evicted oldest entry: ${oldestKey}`);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop cleanup timer (useful for testing or shutdown)
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Validate cache entry structure
   */
  private isValidCacheEntry(entry: any): entry is CacheEntry {
    return (
      entry &&
      typeof entry === 'object' &&
      entry.coordinates &&
      typeof entry.coordinates.lat === 'number' &&
      typeof entry.coordinates.lng === 'number' &&
      typeof entry.timestamp === 'number' &&
      typeof entry.ttl === 'number'
    );
  }
}

// Export singleton instance
export const geocodingCache = GeocodingCache.getInstance();