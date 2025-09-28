import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SpotInfoError,
  classifyError,
  getErrorMessage,
  canRetryError,
  getRetryDelay,
  createFallbackContent,
  shouldShowFallback,
  logError
} from '../errorHandling';

// Mock console methods
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('errorHandling utilities', () => {
  beforeEach(() => {
    mockConsoleError.mockClear();
  });

  describe('SpotInfoError', () => {
    it('should create error with correct properties', () => {
      const error = new SpotInfoError('Test message', 'network', true, 30);
      
      expect(error.message).toBe('Test message');
      expect(error.errorType).toBe('network');
      expect(error.canRetry).toBe(true);
      expect(error.retryAfter).toBe(30);
      expect(error.name).toBe('SpotInfoError');
    });

    it('should create error with default canRetry false', () => {
      const error = new SpotInfoError('Test message', 'not-found');
      
      expect(error.canRetry).toBe(false);
      expect(error.retryAfter).toBeUndefined();
    });
  });

  describe('classifyError', () => {
    it('should handle SpotInfoError instances', () => {
      const error = new SpotInfoError('Custom error', 'rate-limit', true, 60);
      const result = classifyError(error);

      expect(result).toEqual({
        hasError: true,
        errorType: 'rate-limit',
        message: 'Custom error',
        canRetry: true,
        retryAfter: 60,
      });
    });

    it('should classify network errors', () => {
      const error = new Error('Network connection failed');
      const result = classifyError(error);

      expect(result.errorType).toBe('network');
      expect(result.canRetry).toBe(true);
      expect(result.message).toBe('Network error. Please check your connection and try again.');
    });

    it('should classify timeout errors', () => {
      const error = new Error('Request timeout occurred');
      const result = classifyError(error);

      expect(result.errorType).toBe('timeout');
      expect(result.canRetry).toBe(true);
      expect(result.message).toBe('Request timed out. Please try again.');
    });

    it('should classify rate limit errors', () => {
      const error = new Error('Too many requests sent');
      const result = classifyError(error);

      expect(result.errorType).toBe('rate-limit');
      expect(result.canRetry).toBe(true);
      expect(result.retryAfter).toBe(60);
    });

    it('should classify not found errors', () => {
      const error = new Error('Resource not found (404)');
      const result = classifyError(error);

      expect(result.errorType).toBe('not-found');
      expect(result.canRetry).toBe(false);
    });

    it('should classify server errors', () => {
      const error = new Error('Internal server error (500)');
      const result = classifyError(error);

      expect(result.errorType).toBe('server-error');
      expect(result.canRetry).toBe(true);
    });

    it('should classify API key errors', () => {
      const error = new Error('Invalid API key provided');
      const result = classifyError(error);

      expect(result.errorType).toBe('api-key');
      expect(result.canRetry).toBe(false);
    });

    it('should handle unknown error types', () => {
      const error = 'String error';
      const result = classifyError(error);

      expect(result.errorType).toBe('unknown');
      expect(result.canRetry).toBe(true);
      expect(result.message).toBe('An unexpected error occurred. Please try again.');
    });

    it('should preserve original error message for unknown errors', () => {
      const error = new Error('Custom error message');
      const result = classifyError(error);

      expect(result.errorType).toBe('unknown');
      expect(result.message).toBe('Custom error message');
    });
  });

  describe('getErrorMessage', () => {
    it('should return appropriate message for network errors', () => {
      const message = getErrorMessage('network');
      expect(message).toBe('Unable to connect to the server. Please check your internet connection and try again.');
    });

    it('should return appropriate message for timeout errors', () => {
      const message = getErrorMessage('timeout');
      expect(message).toBe('The request took too long to complete. Please try again.');
    });

    it('should return appropriate message for rate limit errors', () => {
      const message = getErrorMessage('rate-limit');
      expect(message).toBe('We\'re receiving too many requests right now. Please wait a moment and try again.');
    });

    it('should return appropriate message for not found errors', () => {
      const message = getErrorMessage('not-found');
      expect(message).toBe('We couldn\'t find detailed information for this location. It may not be available in our database.');
    });

    it('should return appropriate message for server errors', () => {
      const message = getErrorMessage('server-error');
      expect(message).toBe('Our servers are experiencing issues. Please try again in a few minutes.');
    });

    it('should return appropriate message for API key errors', () => {
      const message = getErrorMessage('api-key');
      expect(message).toBe('The location service is temporarily unavailable. Please try again later.');
    });

    it('should return original message for unknown errors when provided', () => {
      const message = getErrorMessage('unknown', 'Custom error message');
      expect(message).toBe('Custom error message');
    });

    it('should return default message for unknown errors without original message', () => {
      const message = getErrorMessage('unknown');
      expect(message).toBe('Something went wrong while loading the spot information. Please try again.');
    });
  });

  describe('canRetryError', () => {
    it('should allow retry for retryable error types', () => {
      expect(canRetryError('network')).toBe(true);
      expect(canRetryError('timeout')).toBe(true);
      expect(canRetryError('rate-limit')).toBe(true);
      expect(canRetryError('server-error')).toBe(true);
      expect(canRetryError('unknown')).toBe(true);
    });

    it('should not allow retry for non-retryable error types', () => {
      expect(canRetryError('not-found')).toBe(false);
      expect(canRetryError('api-key')).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should return appropriate delay for rate limit errors', () => {
      expect(getRetryDelay('rate-limit', 0)).toBe(5000);
      expect(getRetryDelay('rate-limit', 1)).toBe(10000);
      expect(getRetryDelay('rate-limit', 2)).toBe(20000);
      expect(getRetryDelay('rate-limit', 5)).toBe(60000); // Max 60s
    });

    it('should return appropriate delay for server errors', () => {
      expect(getRetryDelay('server-error', 0)).toBe(2000);
      expect(getRetryDelay('server-error', 1)).toBe(4000);
      expect(getRetryDelay('server-error', 2)).toBe(8000);
      expect(getRetryDelay('server-error', 5)).toBe(30000); // Max 30s
    });

    it('should return appropriate delay for network/timeout errors', () => {
      expect(getRetryDelay('network', 0)).toBe(1000);
      expect(getRetryDelay('timeout', 1)).toBe(2000);
      expect(getRetryDelay('network', 2)).toBe(4000);
      expect(getRetryDelay('timeout', 5)).toBe(10000); // Max 10s
    });

    it('should return default delay for unknown error types', () => {
      expect(getRetryDelay('not-found')).toBe(1000);
      expect(getRetryDelay('api-key')).toBe(1000);
    });
  });

  describe('createFallbackContent', () => {
    it('should create fallback content with basic information', () => {
      const result = createFallbackContent('Test Museum', 'New York, NY');

      expect(result).toEqual({
        name: 'Test Museum',
        formattedAddress: 'New York, NY',
        rating: 0,
        userRatingsTotal: 0,
        photos: [],
        reviews: [],
        openingHours: {
          openNow: false,
          periods: [],
          weekdayText: [],
        },
        googleMapsUri: 'https://www.google.com/maps/search/?api=1&query=Test%20Museum%2C%20New%20York%2C%20NY',
      });
    });

    it('should handle special characters in spot name and location', () => {
      const result = createFallbackContent('Café & Restaurant', 'Paris, France');

      expect(result.googleMapsUri).toContain('Caf%C3%A9%20%26%20Restaurant%2C%20Paris%2C%20France');
    });
  });

  describe('shouldShowFallback', () => {
    it('should show fallback for appropriate error types', () => {
      expect(shouldShowFallback('not-found')).toBe(true);
      expect(shouldShowFallback('api-key')).toBe(true);
      expect(shouldShowFallback('rate-limit')).toBe(true);
    });

    it('should not show fallback for inappropriate error types', () => {
      expect(shouldShowFallback('network')).toBe(false);
      expect(shouldShowFallback('timeout')).toBe(false);
      expect(shouldShowFallback('server-error')).toBe(false);
      expect(shouldShowFallback('unknown')).toBe(false);
    });
  });

  describe('logError', () => {
    it('should log error with context and timestamp', () => {
      const error = new Error('Test error');
      logError(error, 'Test context');

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[SpotInfoPopup Error] Test context:',
        expect.objectContaining({
          timestamp: expect.any(String),
          context: 'Test context',
          error: {
            name: 'Error',
            message: 'Test error',
            stack: expect.any(String),
          },
        })
      );
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';
      logError(error, 'Test context');

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[SpotInfoPopup Error] Test context:',
        expect.objectContaining({
          timestamp: expect.any(String),
          context: 'Test context',
          error: 'String error',
        })
      );
    });

    it('should include timestamp in ISO format', () => {
      const error = new Error('Test error');
      logError(error, 'Test context');

      const call = mockConsoleError.mock.calls[0];
      const logData = call[1];
      
      // Check that timestamp is a valid ISO string
      expect(() => new Date(logData.timestamp)).not.toThrow();
      expect(logData.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});