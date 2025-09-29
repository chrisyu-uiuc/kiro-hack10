/**
 * Tests for RouteOptimizationMonitor service
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RouteOptimizationMonitor, routeOptimizationMonitor } from '../RouteOptimizationMonitor.js';

describe('RouteOptimizationMonitor', () => {
  let monitor: RouteOptimizationMonitor;

  beforeEach(() => {
    monitor = RouteOptimizationMonitor.getInstance();
    monitor.clearMetrics();
  });

  afterEach(() => {
    monitor.clearMetrics();
  });

  describe('Basic Monitoring Operations', () => {
    it('should start optimization tracking', () => {
      const requestId = monitor.startOptimization(5, 'walking');
      
      expect(requestId).toBeTruthy();
      expect(requestId).toMatch(/^opt-\d+-[a-z0-9]+$/);
    });

    it('should record phase metrics', () => {
      const requestId = monitor.startOptimization(5, 'walking');
      
      // Should not throw errors
      expect(() => {
        monitor.recordGeocodingPhase(requestId, 100, 3, 2);
        monitor.recordDistanceMatrixPhase(requestId, 200, '5x5', 1);
        monitor.recordOptimizationPhase(requestId, 50, 'nearest-neighbor');
        monitor.recordScheduleGenerationPhase(requestId, 25);
      }).not.toThrow();
    });

    it('should complete optimization tracking successfully', () => {
      const requestId = monitor.startOptimization(5, 'walking');
      
      const phases = {
        geocoding: { duration: 100, cacheHits: 3, apiCalls: 2 },
        distanceMatrix: { duration: 200, matrixSize: '5x5', apiCalls: 1 },
        optimization: { duration: 50, algorithm: 'nearest-neighbor' },
        scheduleGeneration: { duration: 25 },
        total: { duration: 375 }
      };

      const apiQuotaUsage = {
        geocodingCalls: 2,
        distanceMatrixCalls: 1,
        totalCalls: 3
      };

      const cacheEfficiency = {
        geocodingHitRate: 60, // 3 hits out of 5 total
        totalCacheHits: 3
      };

      expect(() => {
        monitor.completeOptimization(
          requestId,
          5,
          'walking',
          375,
          phases,
          apiQuotaUsage,
          cacheEfficiency,
          true
        );
      }).not.toThrow();

      const stats = monitor.getStats();
      expect(stats.totalOptimizations).toBe(1);
      expect(stats.successRate).toBe(100);
    });

    it('should handle failed optimizations', () => {
      const requestId = monitor.startOptimization(5, 'walking');
      
      monitor.completeOptimization(
        requestId,
        5,
        'walking',
        1000,
        { total: { duration: 1000 } },
        { geocodingCalls: 0, distanceMatrixCalls: 0, totalCalls: 0 },
        { geocodingHitRate: 0, totalCacheHits: 0 },
        false,
        'API Error'
      );

      const stats = monitor.getStats();
      expect(stats.totalOptimizations).toBe(1);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate correct statistics for multiple optimizations', () => {
      // Add multiple optimization records
      const optimizations = [
        { spots: 3, mode: 'walking', duration: 1000, success: true },
        { spots: 5, mode: 'driving', duration: 2000, success: true },
        { spots: 8, mode: 'transit', duration: 3000, success: false },
        { spots: 4, mode: 'walking', duration: 1500, success: true }
      ];

      optimizations.forEach(opt => {
        const requestId = monitor.startOptimization(opt.spots, opt.mode);
        monitor.completeOptimization(
          requestId,
          opt.spots,
          opt.mode,
          opt.duration,
          { total: { duration: opt.duration } },
          { geocodingCalls: opt.spots, distanceMatrixCalls: 1, totalCalls: opt.spots + 1 },
          { geocodingHitRate: 50, totalCacheHits: Math.floor(opt.spots / 2) },
          opt.success
        );
      });

      const stats = monitor.getStats();
      expect(stats.totalOptimizations).toBe(4);
      expect(stats.averageOptimizationTime).toBe(1875); // (1000+2000+3000+1500)/4
      expect(stats.averageApiCalls).toBe(6.25); // Average of (4+6+9+5)
      expect(stats.successRate).toBe(75); // 3 out of 4 successful
    });

    it('should handle empty statistics', () => {
      const stats = monitor.getStats();
      
      expect(stats.totalOptimizations).toBe(0);
      expect(stats.averageOptimizationTime).toBe(0);
      expect(stats.averageApiCalls).toBe(0);
      expect(stats.cacheHitRate).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.performanceBySpotCount.size).toBe(0);
      expect(stats.slowOptimizations).toHaveLength(0);
      expect(stats.recentOptimizations).toHaveLength(0);
    });

    it('should group performance by spot count', () => {
      const optimizations = [
        { spots: 3, duration: 1000 },
        { spots: 3, duration: 1200 },
        { spots: 5, duration: 2000 },
        { spots: 5, duration: 2400 }
      ];

      optimizations.forEach(opt => {
        const requestId = monitor.startOptimization(opt.spots, 'walking');
        monitor.completeOptimization(
          requestId,
          opt.spots,
          'walking',
          opt.duration,
          { total: { duration: opt.duration } },
          { geocodingCalls: 0, distanceMatrixCalls: 0, totalCalls: 0 },
          { geocodingHitRate: 0, totalCacheHits: 0 },
          true
        );
      });

      const stats = monitor.getStats();
      const performanceBySpotCount = stats.performanceBySpotCount;
      
      expect(performanceBySpotCount.has(3)).toBe(true);
      expect(performanceBySpotCount.has(5)).toBe(true);
      
      const threeSpotStats = performanceBySpotCount.get(3)!;
      expect(threeSpotStats.count).toBe(2);
      expect(threeSpotStats.averageTime).toBe(1100); // (1000+1200)/2
      
      const fiveSpotStats = performanceBySpotCount.get(5)!;
      expect(fiveSpotStats.count).toBe(2);
      expect(fiveSpotStats.averageTime).toBe(2200); // (2000+2400)/2
    });

    it('should identify slow optimizations', () => {
      // const slowThreshold = 5000;
      const optimizations = [
        { duration: 3000, slow: false },
        { duration: 6000, slow: true },
        { duration: 4000, slow: false },
        { duration: 7000, slow: true }
      ];

      optimizations.forEach((opt) => {
        const requestId = monitor.startOptimization(5, 'walking');
        monitor.completeOptimization(
          requestId,
          5,
          'walking',
          opt.duration,
          { total: { duration: opt.duration } },
          { geocodingCalls: 0, distanceMatrixCalls: 0, totalCalls: 0 },
          { geocodingHitRate: 0, totalCacheHits: 0 },
          true
        );
      });

      const stats = monitor.getStats();
      expect(stats.slowOptimizations).toHaveLength(2);
      
      const slowDurations = stats.slowOptimizations.map(opt => opt.phases.total.duration);
      expect(slowDurations).toContain(6000);
      expect(slowDurations).toContain(7000);
    });
  });

  describe('Recommendations', () => {
    it('should provide recommendations based on performance data', () => {
      // Add optimization with poor cache performance
      const requestId = monitor.startOptimization(5, 'walking');
      monitor.completeOptimization(
        requestId,
        5,
        'walking',
        2000,
        { total: { duration: 2000 } },
        { geocodingCalls: 15, distanceMatrixCalls: 1, totalCalls: 16 }, // High API usage
        { geocodingHitRate: 20, totalCacheHits: 1 }, // Low cache hit rate
        true
      );

      const recommendations = monitor.getRecommendations();
      expect(recommendations).toContain(
        expect.stringMatching(/cache hit rate/i)
      );
      expect(recommendations).toContain(
        expect.stringMatching(/high api usage/i)
      );
    });

    it('should recommend performance improvements for slow optimizations', () => {
      const requestId = monitor.startOptimization(5, 'walking');
      monitor.completeOptimization(
        requestId,
        5,
        'walking',
        4000, // Slow optimization
        { total: { duration: 4000 } },
        { geocodingCalls: 5, distanceMatrixCalls: 1, totalCalls: 6 },
        { geocodingHitRate: 80, totalCacheHits: 4 },
        true
      );

      const recommendations = monitor.getRecommendations();
      expect(recommendations).toContain(
        expect.stringMatching(/optimization time is high/i)
      );
    });

    it('should recommend improvements for low success rate', () => {
      // Add multiple failed optimizations
      for (let i = 0; i < 10; i++) {
        const requestId = monitor.startOptimization(5, 'walking');
        monitor.completeOptimization(
          requestId,
          5,
          'walking',
          1000,
          { total: { duration: 1000 } },
          { geocodingCalls: 0, distanceMatrixCalls: 0, totalCalls: 0 },
          { geocodingHitRate: 0, totalCacheHits: 0 },
          i < 8 // 80% failure rate
        );
      }

      const recommendations = monitor.getRecommendations();
      expect(recommendations).toContain(
        expect.stringMatching(/success rate/i)
      );
    });

    it('should provide positive feedback for good performance', () => {
      const requestId = monitor.startOptimization(5, 'walking');
      monitor.completeOptimization(
        requestId,
        5,
        'walking',
        1000, // Fast
        { total: { duration: 1000 } },
        { geocodingCalls: 2, distanceMatrixCalls: 1, totalCalls: 3 }, // Low API usage
        { geocodingHitRate: 80, totalCacheHits: 4 }, // Good cache hit rate
        true // Successful
      );

      const recommendations = monitor.getRecommendations();
      expect(recommendations).toContain(
        expect.stringMatching(/performance looks good/i)
      );
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive performance report', () => {
      // Add some optimization data
      const requestId = monitor.startOptimization(5, 'walking');
      monitor.completeOptimization(
        requestId,
        5,
        'walking',
        2000,
        { total: { duration: 2000 } },
        { geocodingCalls: 3, distanceMatrixCalls: 1, totalCalls: 4 },
        { geocodingHitRate: 60, totalCacheHits: 3 },
        true
      );

      const report = monitor.generateReport();
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('topSlowOptimizations');
      expect(report).toHaveProperty('apiUsageBreakdown');
      
      expect(report.summary.totalOptimizations).toBe(1);
      expect(report.apiUsageBreakdown.total).toBe(4);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(Array.isArray(report.topSlowOptimizations)).toBe(true);
    });

    it('should include top slow optimizations in report', () => {
      const slowOptimizations = [
        { duration: 8000 },
        { duration: 6000 },
        { duration: 7000 },
        { duration: 5500 },
        { duration: 9000 },
        { duration: 4000 } // This should not be in top 5
      ];

      slowOptimizations.forEach((opt) => {
        const requestId = monitor.startOptimization(5, 'walking');
        monitor.completeOptimization(
          requestId,
          5,
          'walking',
          opt.duration,
          { total: { duration: opt.duration } },
          { geocodingCalls: 0, distanceMatrixCalls: 0, totalCalls: 0 },
          { geocodingHitRate: 0, totalCacheHits: 0 },
          true
        );
      });

      const report = monitor.generateReport();
      expect(report.topSlowOptimizations).toHaveLength(5);
      
      // Should be sorted by duration (descending)
      const durations = report.topSlowOptimizations.map(opt => opt.duration);
      expect(durations).toEqual([9000, 8000, 7000, 6000, 5500]);
    });
  });

  describe('Memory Management', () => {
    it('should trim old metrics when limit is exceeded', () => {
      const originalMaxMetrics = (monitor as any).maxMetrics;
      (monitor as any).maxMetrics = 3; // Set low limit for testing

      try {
        // Add more metrics than the limit
        for (let i = 0; i < 5; i++) {
          const requestId = monitor.startOptimization(5, 'walking');
          monitor.completeOptimization(
            requestId,
            5,
            'walking',
            1000,
            { total: { duration: 1000 } },
            { geocodingCalls: 0, distanceMatrixCalls: 0, totalCalls: 0 },
            { geocodingHitRate: 0, totalCacheHits: 0 },
            true
          );
        }

        const stats = monitor.getStats();
        expect(stats.totalOptimizations).toBe(3); // Should be trimmed to max
      } finally {
        (monitor as any).maxMetrics = originalMaxMetrics;
      }
    });

    it('should provide recent metrics', () => {
      // Add several optimizations
      for (let i = 0; i < 10; i++) {
        const requestId = monitor.startOptimization(5, 'walking');
        monitor.completeOptimization(
          requestId,
          5,
          'walking',
          1000 + i * 100,
          { total: { duration: 1000 + i * 100 } },
          { geocodingCalls: 0, distanceMatrixCalls: 0, totalCalls: 0 },
          { geocodingHitRate: 0, totalCacheHits: 0 },
          true
        );
      }

      const recentMetrics = monitor.getRecentMetrics(5);
      expect(recentMetrics).toHaveLength(5);
      
      // Should be the most recent ones
      const durations = recentMetrics.map(m => m.phases.total.duration);
      expect(durations).toEqual([1500, 1600, 1700, 1800, 1900]);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = RouteOptimizationMonitor.getInstance();
      const instance2 = RouteOptimizationMonitor.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(routeOptimizationMonitor);
    });
  });
});