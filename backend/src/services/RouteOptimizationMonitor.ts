/**
 * Route Optimization Performance Monitor
 * Tracks performance metrics for route optimization operations
 */

interface OptimizationMetric {
  requestId: string;
  timestamp: number;
  spotsCount: number;
  travelMode: string;
  phases: {
    geocoding?: { duration: number; cacheHits: number; apiCalls: number };
    distanceMatrix?: { duration: number; matrixSize: string; apiCalls: number };
    optimization?: { duration: number; algorithm: string };
    scheduleGeneration?: { duration: number };
    total: { duration: number };
  };
  apiQuotaUsage: {
    geocodingCalls: number;
    distanceMatrixCalls: number;
    totalCalls: number;
  };
  cacheEfficiency: {
    geocodingHitRate: number;
    totalCacheHits: number;
  };
  success: boolean;
  error?: string;
}

interface PerformanceStats {
  totalOptimizations: number;
  averageOptimizationTime: number;
  averageApiCalls: number;
  cacheHitRate: number;
  successRate: number;
  performanceBySpotCount: Map<number, { count: number; averageTime: number }>;
  slowOptimizations: OptimizationMetric[];
  recentOptimizations: OptimizationMetric[];
}

export class RouteOptimizationMonitor {
  private static instance: RouteOptimizationMonitor;
  private metrics: OptimizationMetric[] = [];
  private readonly maxMetrics = 500; // Keep last 500 optimizations
  private readonly slowThreshold = 5000; // 5 seconds

  private constructor() { }

  public static getInstance(): RouteOptimizationMonitor {
    if (!RouteOptimizationMonitor.instance) {
      RouteOptimizationMonitor.instance = new RouteOptimizationMonitor();
    }
    return RouteOptimizationMonitor.instance;
  }

  /**
   * Start tracking a route optimization
   */
  startOptimization(spotsCount: number, travelMode: string): string {
    const requestId = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`🚀 [RouteOptimization-${requestId}] Starting optimization`, {
      spotsCount,
      travelMode,
      timestamp: new Date().toISOString()
    });

    return requestId;
  }

  /**
   * Record geocoding phase metrics
   */
  recordGeocodingPhase(
    requestId: string,
    duration: number,
    cacheHits: number,
    apiCalls: number
  ): void {
    console.log(`📍 [RouteOptimization-${requestId}] Geocoding phase completed`, {
      duration: `${duration}ms`,
      cacheHits,
      apiCalls,
      cacheHitRate: apiCalls > 0 ? `${((cacheHits / (cacheHits + apiCalls)) * 100).toFixed(1)}%` : '100%'
    });
  }

  /**
   * Record distance matrix phase metrics
   */
  recordDistanceMatrixPhase(
    requestId: string,
    duration: number,
    matrixSize: string,
    apiCalls: number
  ): void {
    console.log(`🗺️ [RouteOptimization-${requestId}] Distance matrix phase completed`, {
      duration: `${duration}ms`,
      matrixSize,
      apiCalls
    });
  }

  /**
   * Record optimization algorithm phase metrics
   */
  recordOptimizationPhase(
    requestId: string,
    duration: number,
    algorithm: string = 'nearest-neighbor'
  ): void {
    console.log(`🔄 [RouteOptimization-${requestId}] Optimization phase completed`, {
      duration: `${duration}ms`,
      algorithm
    });
  }

  /**
   * Record schedule generation phase metrics
   */
  recordScheduleGenerationPhase(requestId: string, duration: number): void {
    console.log(`📅 [RouteOptimization-${requestId}] Schedule generation completed`, {
      duration: `${duration}ms`
    });
  }

  /**
   * Complete optimization tracking
   */
  completeOptimization(
    requestId: string,
    spotsCount: number,
    travelMode: string,
    totalDuration: number,
    phases: OptimizationMetric['phases'],
    apiQuotaUsage: OptimizationMetric['apiQuotaUsage'],
    cacheEfficiency: OptimizationMetric['cacheEfficiency'],
    success: boolean,
    error?: string
  ): void {
    const metric: OptimizationMetric = {
      requestId,
      timestamp: Date.now(),
      spotsCount,
      travelMode,
      phases: {
        ...phases,
        total: { duration: totalDuration }
      },
      apiQuotaUsage,
      cacheEfficiency,
      success,
      error
    };

    this.metrics.push(metric);
    this.trimMetrics();

    // Log completion
    const status = success ? '✅' : '❌';
    const logData: any = {
      totalDuration: `${totalDuration}ms`,
      spotsCount,
      travelMode,
      apiCalls: apiQuotaUsage.totalCalls,
      cacheHitRate: `${cacheEfficiency.geocodingHitRate.toFixed(1)}%`,
      success
    };

    if (error) {
      logData.error = error;
    }

    console.log(`${status} [RouteOptimization-${requestId}] Optimization completed`, logData);

    // Warn about slow optimizations
    if (totalDuration > this.slowThreshold) {
      console.warn(`⚠️ [RouteOptimization] Slow optimization detected: ${totalDuration}ms for ${spotsCount} spots`);
    }

    // Warn about high API usage
    if (apiQuotaUsage.totalCalls > spotsCount * 2) {
      console.warn(`⚠️ [RouteOptimization] High API usage: ${apiQuotaUsage.totalCalls} calls for ${spotsCount} spots`);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): PerformanceStats {
    const totalOptimizations = this.metrics.length;

    if (totalOptimizations === 0) {
      return {
        totalOptimizations: 0,
        averageOptimizationTime: 0,
        averageApiCalls: 0,
        cacheHitRate: 0,
        successRate: 0,
        performanceBySpotCount: new Map(),
        slowOptimizations: [],
        recentOptimizations: []
      };
    }

    const successfulOptimizations = this.metrics.filter(m => m.success);
    const totalTime = this.metrics.reduce((sum, m) => sum + m.phases.total.duration, 0);
    const totalApiCalls = this.metrics.reduce((sum, m) => sum + m.apiQuotaUsage.totalCalls, 0);
    const totalCacheHits = this.metrics.reduce((sum, m) => sum + m.cacheEfficiency.totalCacheHits, 0);
    const totalGeocodingRequests = this.metrics.reduce((sum, m) =>
      sum + m.apiQuotaUsage.geocodingCalls + m.cacheEfficiency.totalCacheHits, 0);

    // Performance by spot count
    const performanceBySpotCount = new Map<number, { count: number; averageTime: number }>();
    const spotCountGroups = new Map<number, number[]>();

    this.metrics.forEach(metric => {
      const spotCount = metric.spotsCount;
      if (!spotCountGroups.has(spotCount)) {
        spotCountGroups.set(spotCount, []);
      }
      spotCountGroups.get(spotCount)!.push(metric.phases.total.duration);
    });

    spotCountGroups.forEach((times, spotCount) => {
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      performanceBySpotCount.set(spotCount, {
        count: times.length,
        averageTime
      });
    });

    return {
      totalOptimizations,
      averageOptimizationTime: totalTime / totalOptimizations,
      averageApiCalls: totalApiCalls / totalOptimizations,
      cacheHitRate: totalGeocodingRequests > 0 ? (totalCacheHits / totalGeocodingRequests) * 100 : 0,
      successRate: (successfulOptimizations.length / totalOptimizations) * 100,
      performanceBySpotCount,
      slowOptimizations: this.metrics.filter(m => m.phases.total.duration > this.slowThreshold),
      recentOptimizations: this.metrics.slice(-10)
    };
  }

  /**
   * Get optimization recommendations based on performance data
   */
  getRecommendations(): string[] {
    const stats = this.getStats();
    const recommendations: string[] = [];

    if (stats.totalOptimizations === 0) {
      return ['No optimization data available yet'];
    }

    // Cache efficiency recommendations
    if (stats.cacheHitRate < 50) {
      recommendations.push('Low cache hit rate detected. Consider preloading common locations or increasing cache TTL');
    }

    // Performance recommendations
    if (stats.averageOptimizationTime > 3000) {
      recommendations.push('Average optimization time is high. Consider implementing request batching or parallel processing');
    }

    // API usage recommendations
    if (stats.averageApiCalls > 10) {
      recommendations.push('High API usage detected. Implement more aggressive caching or request deduplication');
    }

    // Success rate recommendations
    if (stats.successRate < 95) {
      recommendations.push('Low success rate detected. Review error patterns and implement better fallback strategies');
    }

    // Spot count specific recommendations
    const largeOptimizations = Array.from(stats.performanceBySpotCount.entries())
      .filter(([spotCount, data]) => spotCount > 15 && data.averageTime > 5000);

    if (largeOptimizations.length > 0) {
      recommendations.push('Large optimizations (>15 spots) are slow. Consider implementing route splitting or advanced algorithms');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! No specific recommendations at this time');
    }

    return recommendations;
  }

  /**
   * Generate detailed performance report
   */
  generateReport(): {
    summary: PerformanceStats;
    recommendations: string[];
    topSlowOptimizations: Array<{
      requestId: string;
      duration: number;
      spotsCount: number;
      travelMode: string;
      timestamp: string;
    }>;
    apiUsageBreakdown: {
      geocoding: number;
      distanceMatrix: number;
      total: number;
    };
  } {
    const stats = this.getStats();
    const recommendations = this.getRecommendations();

    // Top 5 slowest optimizations
    const topSlowOptimizations = this.metrics
      .sort((a, b) => b.phases.total.duration - a.phases.total.duration)
      .slice(0, 5)
      .map(metric => ({
        requestId: metric.requestId,
        duration: metric.phases.total.duration,
        spotsCount: metric.spotsCount,
        travelMode: metric.travelMode,
        timestamp: new Date(metric.timestamp).toISOString()
      }));

    // API usage breakdown
    const apiUsageBreakdown = this.metrics.reduce(
      (acc, metric) => ({
        geocoding: acc.geocoding + metric.apiQuotaUsage.geocodingCalls,
        distanceMatrix: acc.distanceMatrix + metric.apiQuotaUsage.distanceMatrixCalls,
        total: acc.total + metric.apiQuotaUsage.totalCalls
      }),
      { geocoding: 0, distanceMatrix: 0, total: 0 }
    );

    return {
      summary: stats,
      recommendations,
      topSlowOptimizations,
      apiUsageBreakdown
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    console.log('🧹 [RouteOptimizationMonitor] Metrics cleared');
  }

  /**
   * Get recent metrics for debugging
   */
  getRecentMetrics(count: number = 10): OptimizationMetric[] {
    return this.metrics.slice(-count);
  }

  /**
   * Trim metrics to prevent memory leaks
   */
  private trimMetrics(): void {
    if (this.metrics.length > this.maxMetrics) {
      const removed = this.metrics.length - this.maxMetrics;
      this.metrics = this.metrics.slice(-this.maxMetrics);
      console.log(`🗑️ [RouteOptimizationMonitor] Trimmed ${removed} old metrics`);
    }
  }
}

// Export singleton instance
export const routeOptimizationMonitor = RouteOptimizationMonitor.getInstance();