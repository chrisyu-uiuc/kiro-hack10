/**
 * Tests for OptimizationPerformanceTracker
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OptimizationPerformanceTracker, optimizationTracker } from '../optimizationPerformance.js';

// Mock performance.now()
const mockPerformanceNow = vi.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
});

describe('OptimizationPerformanceTracker', () => {
  let tracker: OptimizationPerformanceTracker;
  let currentTime = 0;

  beforeEach(() => {
    tracker = OptimizationPerformanceTracker.getInstance();
    tracker.clear();
    currentTime = 0;
    mockPerformanceNow.mockImplementation(() => currentTime);
  });

  afterEach(() => {
    tracker.clear();
    vi.clearAllMocks();
  });

  describe('Basic Tracking Operations', () => {
    it('should start optimization tracking', () => {
      const id = tracker.startOptimization(5, 'walking');
      
      expect(id).toBeTruthy();
      expect(id).toMatch(/^opt-\d+-[a-z0-9]+$/);
    });

    it('should complete optimization tracking successfully', () => {
      currentTime = 1000;
      const id = tracker.startOptimization(5, 'walking');
      
      currentTime = 3000; // 2 seconds later
      
      expect(() => {
        tracker.completeOptimization(id, true, false);
      }).not.toThrow();

      const metrics = tracker.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successRate).toBe(100);
      expect(metrics.averageDuration).toBe(2000);
    });

    it('should handle failed optimizations', () => {
      currentTime = 1000;
      const id = tracker.startOptimization(5, 'walking');
      
      currentTime = 2500; // 1.5 seconds later
      tracker.completeOptimization(id, false, false, 'API Error');

      const metrics = tracker.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successRate).toBe(0);
      expect(metrics.averageDuration).toBe(1500);
    });

    it('should track cached optimizations', () => {
      currentTime = 1000;
      const id = tracker.startOptimization(5, 'walking');
      
      currentTime = 1100; // Fast cached response
      tracker.completeOptimization(id, true, true);

      const metrics = tracker.getMetrics();
      expect(metrics.cacheHitRate).toBe(100);
      expect(metrics.averageDuration).toBe(100);
    });

    it('should handle non-existent request IDs gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(() => {
        tracker.completeOptimization('non-existent-id', true);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Request non-existent-id not found')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate correct metrics for multiple optimizations', () => {
      const optimizations = [
        { spots: 3, mode: 'walking', duration: 1000, success: true, cached: false },
        { spots: 5, mode: 'driving', duration: 2000, success: true, cached: true },
        { spots: 8, mode: 'transit', duration: 6000, success: false, cached: false },
        { spots: 4, mode: 'walking', duration: 1500, success: true, cached: false }
      ];

      optimizations.forEach(opt => {
        currentTime = 1000;
        const id = tracker.startOptimization(opt.spots, opt.mode);
        
        currentTime = 1000 + opt.duration;
        tracker.completeOptimization(id, opt.success, opt.cached);
      });

      const metrics = tracker.getMetrics();
      expect(metrics.totalRequests).toBe(4);
      expect(metrics.averageDuration).toBe(2625); // (1000+2000+6000+1500)/4
      expect(metrics.successRate).toBe(75); // 3 out of 4 successful
      expect(metrics.cacheHitRate).toBe(25); // 1 out of 4 cached
      expect(metrics.slowRequests).toBe(1); // Only the 6000ms one is slow
    });

    it('should handle empty metrics', () => {
      const metrics = tracker.getMetrics();
      
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.averageDuration).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
      expect(metrics.slowRequests).toBe(0);
      expect(metrics.recentRequests).toHaveLength(0);
    });

    it('should identify slow requests correctly', () => {
      const slowThreshold = 5000;
      const optimizations = [
        { duration: 3000, slow: false },
        { duration: 6000, slow: true },
        { duration: 4000, slow: false },
        { duration: 7000, slow: true }
      ];

      optimizations.forEach(opt => {
        currentTime = 1000;
        const id = tracker.startOptimization(5, 'walking');
        
        currentTime = 1000 + opt.duration;
        tracker.completeOptimization(id, true);
      });

      const metrics = tracker.getMetrics();
      expect(metrics.slowRequests).toBe(2); // 6000ms and 7000ms requests
    });

    it('should track recent requests', () => {
      // Add more than 10 requests to test the limit
      for (let i = 0; i < 15; i++) {
        currentTime = 1000 + i * 100;
        const id = tracker.startOptimization(3, 'walking');
        
        currentTime = 1000 + i * 100 + 500;
        tracker.completeOptimization(id, true);
      }

      const metrics = tracker.getMetrics();
      expect(metrics.recentRequests).toHaveLength(10); // Should be limited to 10
      
      // Should be the most recent ones
      const lastRequest = metrics.recentRequests[metrics.recentRequests.length - 1];
      expect(lastRequest.spotsCount).toBe(3);
      expect(lastRequest.success).toBe(true);
    });
  });

  describe('Performance Recommendations', () => {
    it('should recommend improvements for slow optimizations', () => {
      currentTime = 1000;
      const id = tracker.startOptimization(5, 'walking');
      
      currentTime = 4000; // 3 seconds - slow enough to trigger recommendation
      tracker.completeOptimization(id, true);

      const recommendations = tracker.getRecommendations();
      expect(recommendations).toContain(
        expect.stringMatching(/optimization time is high/i)
      );
    });

    it('should recommend improvements for low success rate', () => {
      // Add multiple failed optimizations
      for (let i = 0; i < 10; i++) {
        currentTime = 1000 + i * 100;
        const id = tracker.startOptimization(5, 'walking');
        
        currentTime = 1000 + i * 100 + 1000;
        tracker.completeOptimization(id, i < 7); // 70% failure rate (below 90% threshold)
      }

      const recommendations = tracker.getRecommendations();
      expect(recommendations).toContain(
        expect.stringMatching(/success rate/i)
      );
    });

    it('should recommend improvements for many slow requests', () => {
      // Add requests where 30% are slow (above 20% threshold)
      for (let i = 0; i < 10; i++) {
        currentTime = 1000 + i * 100;
        const id = tracker.startOptimization(5, 'walking');
        
        const duration = i < 3 ? 6000 : 2000; // First 3 are slow
        currentTime = 1000 + i * 100 + duration;
        tracker.completeOptimization(id, true);
      }

      const recommendations = tracker.getRecommendations();
      expect(recommendations).toContain(
        expect.stringMatching(/slow optimizations detected/i)
      );
    });

    it('should recommend cache improvements for low cache usage', () => {
      // Add requests with low cache hit rate
      for (let i = 0; i < 10; i++) {
        currentTime = 1000 + i * 100;
        const id = tracker.startOptimization(5, 'walking');
        
        currentTime = 1000 + i * 100 + 1000;
        tracker.completeOptimization(id, true, i < 1); // Only first one cached (10% - below 20% threshold)
      }

      const recommendations = tracker.getRecommendations();
      expect(recommendations).toContain(
        expect.stringMatching(/cache usage/i)
      );
    });

    it('should provide positive feedback for good performance', () => {
      currentTime = 1000;
      const id = tracker.startOptimization(5, 'walking');
      
      currentTime = 2000; // Fast optimization
      tracker.completeOptimization(id, true, true); // Successful and cached

      const recommendations = tracker.getRecommendations();
      expect(recommendations).toContain(
        expect.stringMatching(/performance looks good/i)
      );
    });

    it('should handle no data gracefully', () => {
      const recommendations = tracker.getRecommendations();
      expect(recommendations).toContain('No optimization data available yet');
    });
  });

  describe('Performance Summary', () => {
    it('should provide good status for good performance', () => {
      currentTime = 1000;
      const id = tracker.startOptimization(5, 'walking');
      
      currentTime = 2000; // Fast
      tracker.completeOptimization(id, true); // Successful

      const summary = tracker.getPerformanceSummary();
      expect(summary.status).toBe('good');
      expect(summary.message).toMatch(/good/i);
    });

    it('should provide warning status for moderate performance issues', () => {
      currentTime = 1000;
      const id = tracker.startOptimization(5, 'walking');
      
      currentTime = 4000; // Moderately slow (3 seconds)
      tracker.completeOptimization(id, true);

      const summary = tracker.getPerformanceSummary();
      expect(summary.status).toBe('warning');
      expect(summary.message).toMatch(/could be improved/i);
    });

    it('should provide poor status for poor performance', () => {
      currentTime = 1000;
      const id = tracker.startOptimization(5, 'walking');
      
      currentTime = 7000; // Very slow (6 seconds)
      tracker.completeOptimization(id, false); // Failed

      const summary = tracker.getPerformanceSummary();
      expect(summary.status).toBe('poor');
      expect(summary.message).toMatch(/needs attention/i);
    });

    it('should handle no data in summary', () => {
      const summary = tracker.getPerformanceSummary();
      expect(summary.status).toBe('good');
      expect(summary.message).toMatch(/no optimization data/i);
    });
  });

  describe('Memory Management', () => {
    it('should trim old requests when limit is exceeded', () => {
      const originalMaxRequests = (tracker as any).maxRequests;
      (tracker as any).maxRequests = 3; // Set low limit for testing

      try {
        // Add more requests than the limit
        for (let i = 0; i < 5; i++) {
          currentTime = 1000 + i * 100;
          const id = tracker.startOptimization(5, 'walking');
          
          currentTime = 1000 + i * 100 + 1000;
          tracker.completeOptimization(id, true);
        }

        const metrics = tracker.getMetrics();
        expect(metrics.totalRequests).toBe(3); // Should be trimmed to max
      } finally {
        (tracker as any).maxRequests = originalMaxRequests;
      }
    });
  });

  describe('Data Export', () => {
    it('should export tracking data', () => {
      currentTime = 1000;
      const id = tracker.startOptimization(5, 'walking');
      
      currentTime = 2000;
      tracker.completeOptimization(id, true);

      const exportedData = tracker.export();
      expect(exportedData).toBeTruthy();
      
      const parsed = JSON.parse(exportedData);
      expect(parsed).toHaveProperty('requests');
      expect(parsed).toHaveProperty('metrics');
      expect(parsed).toHaveProperty('timestamp');
      expect(parsed.requests).toHaveLength(1);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = OptimizationPerformanceTracker.getInstance();
      const instance2 = OptimizationPerformanceTracker.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(optimizationTracker);
    });
  });

  describe('Console Logging', () => {
    it('should log optimization start', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      tracker.startOptimization(5, 'walking');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Started optimization'),
        expect.objectContaining({
          spotsCount: 5,
          travelMode: 'walking'
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should log optimization completion', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      currentTime = 1000;
      const id = tracker.startOptimization(5, 'walking');
      
      currentTime = 2000;
      tracker.completeOptimization(id, true, true);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completed optimization'),
        expect.objectContaining({
          duration: '1000ms',
          spotsCount: 5,
          travelMode: 'walking',
          success: true,
          cached: true
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should warn about slow optimizations', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      currentTime = 1000;
      const id = tracker.startOptimization(5, 'walking');
      
      currentTime = 7000; // 6 seconds - slow
      tracker.completeOptimization(id, true);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow optimization: 6000ms')
      );
      
      consoleSpy.mockRestore();
    });
  });
});