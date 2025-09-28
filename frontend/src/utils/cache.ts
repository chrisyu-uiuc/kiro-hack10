/**
 * Session storage cache utility for spot details and images
 */

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class SessionCache {
  private static readonly SPOT_DETAILS_PREFIX = 'spot_details_';
  private static readonly IMAGE_CACHE_PREFIX = 'image_cache_';
  private static readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Store spot details in session storage with TTL
   */
  static setSpotDetails<T>(spotId: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    try {
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl
      };
      sessionStorage.setItem(
        `${this.SPOT_DETAILS_PREFIX}${spotId}`,
        JSON.stringify(cacheItem)
      );
    } catch (error) {
      console.warn('Failed to cache spot details:', error);
    }
  }

  /**
   * Retrieve spot details from session storage
   */
  static getSpotDetails<T>(spotId: string): T | null {
    try {
      const cached = sessionStorage.getItem(`${this.SPOT_DETAILS_PREFIX}${spotId}`);
      if (!cached) return null;

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      const now = Date.now();

      // Check if cache has expired
      if (now - cacheItem.timestamp > cacheItem.ttl) {
        this.removeSpotDetails(spotId);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.warn('Failed to retrieve cached spot details:', error);
      return null;
    }
  }

  /**
   * Remove spot details from cache
   */
  static removeSpotDetails(spotId: string): void {
    try {
      sessionStorage.removeItem(`${this.SPOT_DETAILS_PREFIX}${spotId}`);
    } catch (error) {
      console.warn('Failed to remove cached spot details:', error);
    }
  }

  /**
   * Cache image blob URL
   */
  static setImageCache(imageUrl: string, blobUrl: string, ttl: number = this.DEFAULT_TTL): void {
    try {
      const cacheItem: CacheItem<string> = {
        data: blobUrl,
        timestamp: Date.now(),
        ttl
      };
      sessionStorage.setItem(
        `${this.IMAGE_CACHE_PREFIX}${btoa(imageUrl)}`,
        JSON.stringify(cacheItem)
      );
    } catch (error) {
      console.warn('Failed to cache image:', error);
    }
  }

  /**
   * Get cached image blob URL
   */
  static getImageCache(imageUrl: string): string | null {
    try {
      const cached = sessionStorage.getItem(`${this.IMAGE_CACHE_PREFIX}${btoa(imageUrl)}`);
      if (!cached) return null;

      const cacheItem: CacheItem<string> = JSON.parse(cached);
      const now = Date.now();

      if (now - cacheItem.timestamp > cacheItem.ttl) {
        this.removeImageCache(imageUrl);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.warn('Failed to retrieve cached image:', error);
      return null;
    }
  }

  /**
   * Remove image from cache
   */
  static removeImageCache(imageUrl: string): void {
    try {
      sessionStorage.removeItem(`${this.IMAGE_CACHE_PREFIX}${btoa(imageUrl)}`);
    } catch (error) {
      console.warn('Failed to remove cached image:', error);
    }
  }

  /**
   * Clear all cached data
   */
  static clearAll(): void {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.SPOT_DETAILS_PREFIX) || key.startsWith(this.IMAGE_CACHE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { spotDetailsCount: number; imageCacheCount: number; totalSize: number } {
    let spotDetailsCount = 0;
    let imageCacheCount = 0;
    let totalSize = 0;

    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.SPOT_DETAILS_PREFIX)) {
          spotDetailsCount++;
        } else if (key.startsWith(this.IMAGE_CACHE_PREFIX)) {
          imageCacheCount++;
        }
        
        const value = sessionStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      });
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
    }

    return { spotDetailsCount, imageCacheCount, totalSize };
  }
}