import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceMonitor, ImagePerformanceTracker } from '../performance.js';

// Mock performance.now()
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    PerformanceMonitor.clearMetrics();
    mockPerformanceNow.mockReturnValue(1000);
  });

  describe('startMeasure and endMeasure', () => {
    it('should measure operation duration', () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1500);

      const id = PerformanceMonitor.startMeasure('test-operation');
      const metric = PerformanceMonitor.endMeasure(id);

      expect(metric).toEqual({
        name: 'test-operation',
        startTime: 1000,
        endTime: 1500,
        duration: 500
      });
    });

    it('should handle metadata', () => {
      const metadata = { userId: '123', action: 'click' };
      const id = PerformanceMonitor.startMeasure('test-operation', metadata);
      const metric = PerformanceMonitor.endMeasure(id);

      expect(metric?.metadata).toEqual(metadata);
    });

    it('should return null for non-existent metric', () => {
      const metric = PerformanceMonitor.endMeasure('non-existent-id');
      expect(metric).toBeNull();
    });

    it('should warn about non-existent metrics', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      PerformanceMonitor.endMeasure('non-existent-id');

      expect(consoleSpy).toHaveBeenCalledWith('Performance metric not found: non-existent-id');
      consoleSpy.mockRestore();
    });
  });

  describe('measureAsync', () => {
    it('should measure async operation duration', async () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1200);

      const operation = vi.fn().mockResolvedValue('result');
      const { result, metric } = await PerformanceMonitor.measureAsync('async-test', operation);

      expect(result).toBe('result');
      expect(metric.duration).toBe(200);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle async operation errors', async () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(1100);

      const error = new Error('Operation failed');
      const operation = vi.fn().mockRejectedValue(error);

      await expect(
        PerformanceMonitor.measureAsync('async-test', operation)
      ).rejects.toThrow('Operation failed');
    });

    it('should warn about slow operations', async () => {
      mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(2500); // 1500ms duration

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const operation = vi.fn().mockResolvedValue('result');

      await PerformanceMonitor.measureAsync('slow-operation', operation);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Slow operation detected: slow-operation took 1500.00ms'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('trackApiCall', () => {
    it('should track API call metrics', () => {
      PerformanceMonitor.trackApiCall(
        '/api/test',
        'GET',
        1000,
        1200,
        200,
        1024,
        false
      );

      const stats = PerformanceMonitor.getStats();
      expect(stats.apiCalls.total).toBe(1);
      expect(stats.apiCalls.averageDuration).toBe(200);
    });

    it('should warn about slow API calls', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      PerformanceMonitor.trackApiCall(
        '/api/slow',
        'POST',
        1000,
        3500, // 2500ms duration
        200,
        1024,
        false
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Slow API call: POST /api/slow took 2500.00ms'
      );
      consoleSpy.mockRestore();
    });

    it('should limit stored metrics', () => {
      // Track more than the limit (100 metrics)
      for (let i = 0; i < 150; i++) {
        PerformanceMonitor.trackApiCall(
          `/api/test-${i}`,
          'GET',
          1000,
          1100,
          200,
          100,
          false
        );
      }

      const recentCalls = PerformanceMonitor.getRecentApiCalls(200);
      expect(recentCalls.length).toBe(100); // Should be limited to maxMetrics
    });
  });

  describe('getStats', () => {
    it('should return empty stats when no metrics exist', () => {
      const stats = PerformanceMonitor.getStats();

      expect(stats).toEqual({
        apiCalls: {
          total: 0,
          averageDuration: 0,
          slowCalls: 0,
          cachedCalls: 0,
          errorRate: 0
        },
        activeMetrics: 0
      });
    });

    it('should calculate correct statistics', () => {
      // Add various API calls
      PerformanceMonitor.trackApiCall('/api/fast', 'GET', 1000, 1100, 200, 100, false);
      PerformanceMonitor.trackApiCall('/api/slow', 'POST', 1000, 3500, 200, 200, false);
      PerformanceMonitor.trackApiCall('/api/cached', 'GET', 1000, 1050, 200, 150, true);
      PerformanceMonitor.trackApiCall('/api/error', 'DELETE', 1000, 1200, 404, 50, false);

      const stats = PerformanceMonitor.getStats();

      expect(stats.apiCalls.total).toBe(4);
      expect(stats.apiCalls.averageDuration).toBe((100 + 2500 + 50 + 200) / 4);
      expect(stats.apiCalls.slowCalls).toBe(1); // Only the 2500ms call
      expect(stats.apiCalls.cachedCalls).toBe(1);
      expect(stats.apiCalls.errorRate).toBe(0.25); // 1 error out of 4 calls
    });
  });

  describe('getRecentApiCalls', () => {
    it('should return recent API calls', () => {
      PerformanceMonitor.trackApiCall('/api/1', 'GET', 1000, 1100, 200, 100, false);
      PerformanceMonitor.trackApiCall('/api/2', 'POST', 1000, 1200, 201, 200, false);
      PerformanceMonitor.trackApiCall('/api/3', 'PUT', 1000, 1150, 200, 150, false);

      const recentCalls = PerformanceMonitor.getRecentApiCalls(2);

      expect(recentCalls).toHaveLength(2);
      expect(recentCalls[0].url).toBe('/api/2');
      expect(recentCalls[1].url).toBe('/api/3');
    });
  });

  describe('logSummary', () => {
    it('should log performance summary', () => {
      const consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      PerformanceMonitor.trackApiCall('/api/test', 'GET', 1000, 1100, 200, 100, false);
      PerformanceMonitor.logSummary();

      expect(consoleGroupSpy).toHaveBeenCalledWith('Performance Summary');
      expect(consoleLogSpy).toHaveBeenCalledWith('API Calls:', expect.any(Object));
      expect(consoleGroupEndSpy).toHaveBeenCalled();

      consoleGroupSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });
  });
});

describe('ImagePerformanceTracker', () => {
  beforeEach(() => {
    mockPerformanceNow.mockReturnValue(1000);
  });

  it('should track image loading performance', () => {
    const trackApiCallSpy = vi.spyOn(PerformanceMonitor, 'trackApiCall').mockImplementation(() => {});

    // Set up the mock to return different values for start and end
    mockPerformanceNow.mockReturnValueOnce(1000); // startImageLoad call
    ImagePerformanceTracker.startImageLoad('https://example.com/image.jpg');
    
    mockPerformanceNow.mockReturnValueOnce(1500); // endImageLoad call
    ImagePerformanceTracker.endImageLoad('https://example.com/image.jpg', true);

    expect(trackApiCallSpy).toHaveBeenCalledWith(
      'https://example.com/image.jpg',
      'GET',
      1000,
      1500,
      200,
      undefined,
      false
    );

    trackApiCallSpy.mockRestore();
  });

  it('should track failed image loads', () => {
    const trackApiCallSpy = vi.spyOn(PerformanceMonitor, 'trackApiCall').mockImplementation(() => {});

    // Set up the mock to return different values for start and end
    mockPerformanceNow.mockReturnValueOnce(1000); // startImageLoad call
    ImagePerformanceTracker.startImageLoad('https://example.com/broken.jpg');
    
    mockPerformanceNow.mockReturnValueOnce(1200); // endImageLoad call
    ImagePerformanceTracker.endImageLoad('https://example.com/broken.jpg', false);

    expect(trackApiCallSpy).toHaveBeenCalledWith(
      'https://example.com/broken.jpg',
      'GET',
      1000,
      1200,
      404,
      undefined,
      false
    );

    trackApiCallSpy.mockRestore();
  });

  it('should warn about slow image loads', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(4500); // 3500ms

    ImagePerformanceTracker.startImageLoad('https://example.com/slow.jpg');
    ImagePerformanceTracker.endImageLoad('https://example.com/slow.jpg', true);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Slow image load: https://example.com/slow.jpg took 3500.00ms'
    );
    consoleSpy.mockRestore();
  });

  it('should track loading count', () => {
    expect(ImagePerformanceTracker.getLoadingCount()).toBe(0);

    ImagePerformanceTracker.startImageLoad('https://example.com/image1.jpg');
    ImagePerformanceTracker.startImageLoad('https://example.com/image2.jpg');
    
    expect(ImagePerformanceTracker.getLoadingCount()).toBe(2);

    ImagePerformanceTracker.endImageLoad('https://example.com/image1.jpg', true);
    
    expect(ImagePerformanceTracker.getLoadingCount()).toBe(1);
  });

  it('should handle ending load for non-tracked images', () => {
    expect(() => {
      ImagePerformanceTracker.endImageLoad('https://example.com/unknown.jpg', true);
    }).not.toThrow();
  });
});