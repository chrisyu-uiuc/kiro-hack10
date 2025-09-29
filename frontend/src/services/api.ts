import axios, { AxiosResponse } from 'axios';
import {
  ApiResponse,
  CityVerificationResponse,
  SpotGenerationResponse,
  SpotSelectionResponse,
  ItineraryGenerationResponse,
  EnhancedItineraryResult,
  SpotDetailsResponse,
  GooglePlaceDetails,
  ItineraryOptions,
} from '../types';

// Performance monitoring types
interface PerformanceOverview {
  cache: {
    hitRate: number;
    totalEntries: number;
    memoryUsage: number;
  };
  optimization: {
    totalOptimizations: number;
    averageOptimizationTime: number;
    successRate: number;
  };
  apiMetrics: {
    totalRequests: number;
    successfulRequests: number;
    averageResponseTime: number;
  };
  recommendations: string[];
}
import { SessionCache } from '../utils/cache.js';
import { PerformanceMonitor } from '../utils/performance.js';
import { RequestDeduplicator, debounce } from '../utils/debounce.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging and performance tracking
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    
    // Add performance tracking metadata
    (config as any).metadata = {
      startTime: performance.now()
    };
    
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging, error handling, and performance tracking
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status}`, response.data);
    
    // Track API call performance
    const startTime = (response.config as any)?.metadata?.startTime;
    if (startTime) {
      PerformanceMonitor.trackApiCall(
        response.config.url || '',
        response.config.method?.toUpperCase() || 'GET',
        startTime,
        performance.now(),
        response.status,
        JSON.stringify(response.data).length,
        false // Not cached since it's a real API call
      );
    }
    
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    
    // Track failed API calls
    const startTime = (error.config as any)?.metadata?.startTime;
    if (startTime) {
      PerformanceMonitor.trackApiCall(
        error.config?.url || '',
        error.config?.method?.toUpperCase() || 'GET',
        startTime,
        performance.now(),
        error.response?.status || 0,
        0,
        false
      );
    }
    
    return Promise.reject(error);
  }
);

export class ApiService {
  /**
   * Verify if a city exists
   */
  static async verifyCity(city: string): Promise<CityVerificationResponse> {
    try {
      console.log(`🌐 Verifying city: "${city}"`);
      const response: AxiosResponse<ApiResponse<CityVerificationResponse>> = await apiClient.post(
        '/verify-city',
        { city }
      );

      console.log(`✅ City verification response:`, response.data);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to verify city');
      }

      return response.data.data;
    } catch (error) {
      console.log(`❌ City verification error:`, error);
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        console.log(`❌ Backend error message:`, error.response.data.error.message);
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Network error. Please check your connection and try again.');
    }
  }

  /**
   * Generate spots for a city
   */
  static async generateSpots(city: string, sessionId: string): Promise<SpotGenerationResponse> {
    try {
      const response: AxiosResponse<ApiResponse<SpotGenerationResponse>> = await apiClient.post(
        '/generate-spots',
        { city, sessionId }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to generate spots');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Network error. Please check your connection and try again.');
    }
  }

  /**
   * Load more spots for the current session
   */
  static async loadMoreSpots(sessionId: string): Promise<SpotGenerationResponse> {
    try {
      const response: AxiosResponse<ApiResponse<SpotGenerationResponse>> = await apiClient.post(
        '/load-more-spots',
        { sessionId }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to load more spots');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Network error. Please check your connection and try again.');
    }
  }

  /**
   * Store selected spots
   */
  static async storeSelections(
    selectedSpots: string[],
    sessionId: string
  ): Promise<SpotSelectionResponse> {
    try {
      const response: AxiosResponse<ApiResponse<SpotSelectionResponse>> = await apiClient.post(
        '/store-selections',
        { selectedSpots, sessionId }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to store selections');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Network error. Please check your connection and try again.');
    }
  }

  /**
   * Generate itinerary from selected spots
   */
  static async generateItinerary(sessionId: string): Promise<ItineraryGenerationResponse> {
    try {
      const response: AxiosResponse<ApiResponse<ItineraryGenerationResponse>> = await apiClient.post(
        '/generate-itinerary',
        { sessionId }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to generate itinerary');
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Network error. Please check your connection and try again.');
    }
  }

  /**
   * Generate optimized itinerary with Google Maps integration
   */
  static async generateOptimizedItinerary(
    sessionId: string,
    options: ItineraryOptions = {}
  ): Promise<EnhancedItineraryResult> {
    // Import performance tracker dynamically to avoid circular dependencies
    const { optimizationTracker } = await import('../utils/optimizationPerformance.js');
    
    // Estimate spots count for performance tracking (fallback to 5 if unknown)
    const spotsCount = 5; // Default spots count for tracking
    const travelMode = options.travelMode || 'transit';
    
    // Start performance tracking
    const trackingId = optimizationTracker.startOptimization(spotsCount, travelMode);
    
    try {
      console.log(`🗺️ Generating optimized itinerary for session: ${sessionId}`, options);
      
      const response: AxiosResponse<ApiResponse<EnhancedItineraryResult>> = await apiClient.post(
        '/itinerary/optimize',
        { 
          sessionId,
          travelMode: options.travelMode || 'transit',
          startTime: options.startTime || '09:00',
          visitDuration: options.visitDuration || 60,
          includeBreaks: options.includeBreaks || false
        }
      );

      if (!response.data.success || !response.data.data) {
        const errorMessage = response.data.error?.message || 'Failed to generate optimized itinerary';
        optimizationTracker.completeOptimization(trackingId, false, false, errorMessage);
        throw new Error(errorMessage);
      }

      // Check if result was cached (assuming false for now)
      const wasCached = false;
      optimizationTracker.completeOptimization(trackingId, true, wasCached);

      return response.data.data;
    } catch (error) {
      console.error('❌ Optimized itinerary generation error:', error);
      
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.error
        ? error.response.data.error.message
        : 'Network error. Please check your connection and try again.';
      
      optimizationTracker.completeOptimization(trackingId, false, false, errorMessage);
      
      throw new Error(errorMessage);
    }
  }

  // Request deduplication cache
  private static pendingRequests = new Map<string, Promise<GooglePlaceDetails>>();
  private static requestCache = new Map<string, { data: GooglePlaceDetails; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch detailed information for a specific spot
   * Includes session storage caching, request deduplication, and retry logic
   */
  static async fetchSpotDetails(
    spotId: string,
    spotName: string,
    spotLocation?: string,
    retryCount = 0
  ): Promise<GooglePlaceDetails> {
    const cacheKey = `${spotId}-${spotName}`;
    
    // Check session storage cache first (persistent across page reloads)
    const sessionCached = SessionCache.getSpotDetails<GooglePlaceDetails>(cacheKey);
    if (sessionCached) {
      console.log(`📋 Using session cached spot details for: ${spotName}`);
      
      // Track cached API call for performance monitoring
      PerformanceMonitor.trackApiCall(
        `/spots/${spotId}/details`,
        'POST',
        performance.now(),
        performance.now() + 1, // Minimal time for cache hit
        200,
        JSON.stringify(sessionCached).length,
        true // Cached
      );
      
      return sessionCached;
    }
    
    // Check memory cache (faster but not persistent)
    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`💾 Using memory cached spot details for: ${spotName}`);
      
      // Track cached API call
      PerformanceMonitor.trackApiCall(
        `/spots/${spotId}/details`,
        'POST',
        performance.now(),
        performance.now() + 1,
        200,
        JSON.stringify(cached.data).length,
        true
      );
      
      return cached.data;
    }

    // Use request deduplication to prevent multiple identical requests
    return RequestDeduplicator.deduplicate(
      cacheKey,
      async () => {
        console.log(`🌐 Fetching fresh spot details for: ${spotName}`);
        
        const result = await this.performSpotDetailsRequest(spotId, spotName, spotLocation);
        
        // Cache successful result in both memory and session storage
        this.requestCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        // Store in session storage with longer TTL (30 minutes)
        SessionCache.setSpotDetails(cacheKey, result, 30 * 60 * 1000);
        
        return result;
      },
      10000 // 10 second deduplication window
    );
  }

  /**
   * Perform the actual API request for spot details
   */
  private static async performSpotDetailsRequest(
    spotId: string,
    spotName: string,
    spotLocation?: string
  ): Promise<GooglePlaceDetails> {
    try {
      const response: AxiosResponse<SpotDetailsResponse> = await apiClient.get(
        `/spots/${encodeURIComponent(spotId)}/details`,
        { 
          params: {
            spotName,
            spotLocation 
          }
        }
      );

      if (!response.data.success || !response.data.data) {
        const errorMessage = response.data.error || 'Failed to fetch spot details';
        const apiError = new Error(errorMessage);
        (apiError as any).isApiError = true;
        throw apiError;
      }

      return response.data.data;
    } catch (error) {
      // Handle API response errors (thrown from success check above)
      if ((error as any).isApiError) {
        throw error;
      }
      
      if (axios.isAxiosError(error)) {
        // Handle specific HTTP error codes
        const status = error.response?.status;
        if (status === 404) {
          throw new Error('Spot information not found. This location may not be available in our database.');
        } else if (status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        } else if (status !== undefined && status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
      }
      
      // Network or other errors
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please check your connection and try again.');
      }
      
      throw new Error('Network error. Please check your connection and try again.');
    }
  }

  /**
   * Determine if an error should trigger a retry
   */
  private static shouldRetry(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      // Retry on server errors (5xx) and timeout errors
      return (status !== undefined && status >= 500) || error.code === 'ECONNABORTED';
    }
    return false;
  }

  /**
   * Utility function for delays in retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear the spot details cache (useful for testing or manual cache invalidation)
   */
  static clearSpotDetailsCache(): void {
    this.requestCache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  static getCacheStats(): { 
    cacheSize: number; 
    pendingRequests: number;
    sessionCacheStats: { spotDetailsCount: number; imageCacheCount: number; totalSize: number };
    performanceStats: any;
  } {
    return {
      cacheSize: this.requestCache.size,
      pendingRequests: this.pendingRequests.size,
      sessionCacheStats: SessionCache.getCacheStats(),
      performanceStats: PerformanceMonitor.getStats()
    };
  }

  // Debounced versions of API methods to prevent rapid button clicks
  static debouncedFetchSpotDetails = debounce(
    (spotId: string, spotName: string, spotLocation?: string) => 
      this.fetchSpotDetails(spotId, spotName, spotLocation),
    300 // 300ms debounce
  );

  static debouncedVerifyCity = debounce(
    (city: string) => this.verifyCity(city),
    500 // 500ms debounce for city verification
  );

  static debouncedGenerateSpots = debounce(
    (city: string, sessionId: string) => this.generateSpots(city, sessionId),
    1000 // 1 second debounce for spot generation
  );

  static debouncedLoadMoreSpots = debounce(
    (sessionId: string) => this.loadMoreSpots(sessionId),
    1000 // 1 second debounce for loading more spots
  );

  /**
   * Performance monitoring methods
   */
  static logPerformanceStats(): void {
    PerformanceMonitor.logSummary();
  }

  static clearPerformanceMetrics(): void {
    PerformanceMonitor.clearMetrics();
  }

  /**
   * Preload spot details for better perceived performance
   */
  static async preloadSpotDetails(spots: Array<{ id: string; name: string; location?: string }>): Promise<void> {
    const preloadPromises = spots.slice(0, 3).map(spot => // Preload first 3 spots
      this.fetchSpotDetails(spot.id, spot.name, spot.location).catch(error => {
        console.warn(`Failed to preload spot details for ${spot.name}:`, error);
      })
    );

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Fetch backend performance overview
   */
  static async getPerformanceOverview(): Promise<PerformanceOverview> {
    try {
      const response: AxiosResponse<ApiResponse<PerformanceOverview>> = await apiClient.get(
        '/monitoring/performance/overview'
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to fetch performance overview');
      }

      return response.data.data;
    } catch (error) {
      console.error('❌ Performance overview error:', error);
      
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to fetch performance metrics');
    }
  }

  /**
   * Fetch cache statistics from backend
   */
  static async getCacheStatistics(): Promise<any> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.get(
        '/monitoring/performance/cache'
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to fetch cache statistics');
      }

      return response.data.data;
    } catch (error) {
      console.error('❌ Cache statistics error:', error);
      
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to fetch cache statistics');
    }
  }

  /**
   * Fetch optimization performance report from backend
   */
  static async getOptimizationReport(): Promise<any> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.get(
        '/monitoring/performance/optimization'
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to fetch optimization report');
      }

      return response.data.data;
    } catch (error) {
      console.error('❌ Optimization report error:', error);
      
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to fetch optimization report');
    }
  }

  /**
   * Preload common locations into backend cache
   */
  static async preloadCommonLocations(locations: string[]): Promise<void> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.post(
        '/monitoring/performance/preload',
        { locations }
      );

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to preload locations');
      }

      console.log(`✅ Preloaded ${locations.length} locations into backend cache`);
    } catch (error) {
      console.error('❌ Preload locations error:', error);
      
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to preload locations');
    }
  }

  /**
   * Clear backend performance data
   */
  static async clearBackendPerformanceData(options: {
    cache?: boolean;
    optimization?: boolean;
    logs?: boolean;
  } = {}): Promise<void> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await apiClient.post(
        '/monitoring/performance/clear',
        options
      );

      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to clear performance data');
      }

      console.log('✅ Backend performance data cleared successfully');
    } catch (error) {
      console.error('❌ Clear performance data error:', error);
      
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to clear performance data');
    }
  }
}

export default ApiService;