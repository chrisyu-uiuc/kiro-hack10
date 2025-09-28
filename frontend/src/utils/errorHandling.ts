import { PopupErrorState } from '@/types';

/**
 * Error classification and handling utilities for the SpotInfoPopup
 */

export class SpotInfoError extends Error {
  constructor(
    message: string,
    public errorType: PopupErrorState['errorType'],
    public canRetry: boolean = false,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'SpotInfoError';
  }
}

/**
 * Classify an error and create appropriate PopupErrorState
 */
export function classifyError(error: unknown): PopupErrorState {
  // Handle SpotInfoError instances
  if (error instanceof SpotInfoError) {
    return {
      hasError: true,
      errorType: error.errorType,
      message: error.message,
      canRetry: error.canRetry,
      retryAfter: error.retryAfter,
    };
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network-related errors
    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return {
        hasError: true,
        errorType: 'network',
        message: 'Network error. Please check your connection and try again.',
        canRetry: true,
      };
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('aborted')) {
      return {
        hasError: true,
        errorType: 'timeout',
        message: 'Request timed out. Please try again.',
        canRetry: true,
      };
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests') || message.includes('quota')) {
      return {
        hasError: true,
        errorType: 'rate-limit',
        message: 'Too many requests. Please wait a moment and try again.',
        canRetry: true,
        retryAfter: 60, // Suggest waiting 60 seconds
      };
    }

    // Not found errors
    if (message.includes('not found') || message.includes('404')) {
      return {
        hasError: true,
        errorType: 'not-found',
        message: 'Spot information not found. This location may not be available in our database.',
        canRetry: false,
      };
    }

    // Server errors
    if (message.includes('server error') || message.includes('500') || message.includes('503')) {
      return {
        hasError: true,
        errorType: 'server-error',
        message: 'Server error. Please try again later.',
        canRetry: true,
      };
    }

    // API key errors
    if (message.includes('api key') || message.includes('unauthorized') || message.includes('403')) {
      return {
        hasError: true,
        errorType: 'api-key',
        message: 'Service temporarily unavailable. Please try again later.',
        canRetry: false,
      };
    }

    // Generic error with the original message
    return {
      hasError: true,
      errorType: 'unknown',
      message: error.message || 'An unexpected error occurred.',
      canRetry: true,
    };
  }

  // Handle unknown error types
  return {
    hasError: true,
    errorType: 'unknown',
    message: 'An unexpected error occurred. Please try again.',
    canRetry: true,
  };
}

/**
 * Create user-friendly error messages based on error type
 */
export function getErrorMessage(errorType: PopupErrorState['errorType'], originalMessage?: string): string {
  switch (errorType) {
    case 'network':
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    
    case 'timeout':
      return 'The request took too long to complete. Please try again.';
    
    case 'rate-limit':
      return 'We\'re receiving too many requests right now. Please wait a moment and try again.';
    
    case 'not-found':
      return 'We couldn\'t find detailed information for this location. It may not be available in our database.';
    
    case 'server-error':
      return 'Our servers are experiencing issues. Please try again in a few minutes.';
    
    case 'api-key':
      return 'The location service is temporarily unavailable. Please try again later.';
    
    case 'unknown':
    default:
      return originalMessage || 'Something went wrong while loading the spot information. Please try again.';
  }
}

/**
 * Determine if an error should allow retry based on error type
 */
export function canRetryError(errorType: PopupErrorState['errorType']): boolean {
  switch (errorType) {
    case 'network':
    case 'timeout':
    case 'rate-limit':
    case 'server-error':
    case 'unknown':
      return true;
    
    case 'not-found':
    case 'api-key':
      return false;
    
    default:
      return false;
  }
}

/**
 * Get suggested retry delay based on error type (in milliseconds)
 */
export function getRetryDelay(errorType: PopupErrorState['errorType'], retryCount: number = 0): number {
  switch (errorType) {
    case 'rate-limit':
      return Math.min(60000, 5000 * Math.pow(2, retryCount)); // Exponential backoff, max 60s
    
    case 'server-error':
      return Math.min(30000, 2000 * Math.pow(2, retryCount)); // Exponential backoff, max 30s
    
    case 'network':
    case 'timeout':
      return Math.min(10000, 1000 * Math.pow(2, retryCount)); // Exponential backoff, max 10s
    
    default:
      return 1000; // 1 second default
  }
}

/**
 * Create fallback content when Google Places data is unavailable
 */
export function createFallbackContent(spotName: string, spotLocation: string) {
  return {
    name: spotName,
    formattedAddress: spotLocation,
    rating: 0,
    userRatingsTotal: 0,
    photos: [],
    reviews: [],
    openingHours: {
      openNow: false,
      periods: [],
      weekdayText: [],
    },
    googleMapsUri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${spotName}, ${spotLocation}`)}`,
  };
}

/**
 * Validate if error state should show fallback content
 */
export function shouldShowFallback(errorType: PopupErrorState['errorType']): boolean {
  // Show fallback for errors where we can still display basic information
  return ['not-found', 'api-key', 'rate-limit'].includes(errorType);
}

/**
 * Log error for debugging and monitoring
 */
export function logError(error: unknown, context: string): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
  };

  console.error(`[SpotInfoPopup Error] ${context}:`, errorInfo);

  // In production, you might want to send this to an error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to error tracking service
    // errorTrackingService.captureError(errorInfo);
  }
}