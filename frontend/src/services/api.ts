import axios, { AxiosResponse } from 'axios';
import {
  ApiResponse,
  CityVerificationResponse,
  SpotGenerationResponse,
  SpotSelectionResponse,
  ItineraryGenerationResponse,
  SpotDetailsResponse,
  GooglePlaceDetails,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status}`, response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export class ApiService {
  /**
   * Verify if a city exists
   */
  static async verifyCity(city: string): Promise<CityVerificationResponse> {
    try {
      const response: AxiosResponse<ApiResponse<CityVerificationResponse>> = await apiClient.post(
        '/verify-city',
        { city }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.message || 'Failed to verify city');
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

  // Request deduplication cache
  private static pendingRequests = new Map<string, Promise<GooglePlaceDetails>>();
  private static requestCache = new Map<string, { data: GooglePlaceDetails; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch detailed information for a specific spot
   * Includes request deduplication, caching, and retry logic
   */
  static async fetchSpotDetails(
    spotId: string,
    spotName: string,
    spotLocation?: string,
    retryCount = 0
  ): Promise<GooglePlaceDetails> {
    const cacheKey = `${spotId}-${spotName}`;
    
    // Check cache first
    const cached = this.requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`📋 Using cached spot details for: ${spotName}`);
      return cached.data;
    }

    // Check if request is already pending (deduplication)
    const pendingRequest = this.pendingRequests.get(cacheKey);
    if (pendingRequest) {
      console.log(`⏳ Deduplicating request for: ${spotName}`);
      return pendingRequest;
    }

    // Create new request
    const requestPromise = this.performSpotDetailsRequest(spotId, spotName, spotLocation);
    
    // Store pending request for deduplication
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      
      // Cache successful result
      this.requestCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      // Implement retry logic for specific error types
      if (retryCount < 2 && this.shouldRetry(error)) {
        console.log(`🔄 Retrying spot details request for: ${spotName} (attempt ${retryCount + 1})`);
        await this.delay(Math.pow(2, retryCount) * 1000); // Exponential backoff
        return this.fetchSpotDetails(spotId, spotName, spotLocation, retryCount + 1);
      }

      throw error;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(cacheKey);
    }
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
      const response: AxiosResponse<SpotDetailsResponse> = await apiClient.post(
        `/spots/${encodeURIComponent(spotId)}/details`,
        { 
          spotName,
          spotLocation 
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
  static getCacheStats(): { cacheSize: number; pendingRequests: number } {
    return {
      cacheSize: this.requestCache.size,
      pendingRequests: this.pendingRequests.size
    };
  }
}

export default ApiService;