import axios, { AxiosResponse } from 'axios';
import {
  ApiResponse,
  CityVerificationResponse,
  SpotGenerationResponse,
  SpotSelectionResponse,
  ItineraryGenerationResponse,
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
}

export default ApiService;