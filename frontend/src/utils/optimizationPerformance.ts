/**
 * Frontend performance monitoring for route optimization
 * Tracks optimization request performance and provides insights
 */

import { PerformanceMonitor } from './performance.js';

interface OptimizationRequest {
  id: string;
  timestamp: number;
  spotsCount: number;
  travelMode: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  cached?: boolean;
  error?: string;
}

interface OptimizationMetrics {
  totalRequests: number;
  averageDuration: number;
  successRate: number;
  cacheHitRate: number;
  slowRequests: number;
  recentRequests: OptimizationRequest[];
}

export class OptimizationPerformanceTracker {
  private static instance: OptimizationPerformanceTracker;
  private requests: OptimizationRequest[] = [];
  private readonly maxRequests = 100;
  private readonly slowThreshold = 5000; // 5 seconds

  private constructor() {}

  public static getInstance(): OptimizationPerformanceTracker {
    if (!OptimizationPerformanceTracker.instance) {
      OptimizationPerformanceTracker.instance = new OptimizationPerformanceTracker();
    }
    return OptimizationPerformanceTracker.instance;
  }

  /**
   * Start tracking an optimization request
   */
  startOptimization(spotsCount: number, travelMode: string): string {
    const id = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const request: OptimizationRequest = {
      id,
      timestamp: Date.now(),
      spotsCount,
      travelMode,
      startTime: performance.now(),
      success: false
    };

    this.requests.push(request);
    this.trimRequests();

    console.log(`🚀 [OptimizationTracker] Started optimization ${id}`, {
      spotsCount,
      travelMode
    });

    return id;
  }

  /**
   * Complete optimization tracking
   */
  completeOptimization(
    id: string, 
    success: boolean, 
    cached = false, 
    error?: string
  ): void {
    const request = this.requests.find(r => r.id === id);
    if (!request) {
      console.warn(`[OptimizationTracker] Request ${id} not found`);
      return;
    }

    request.endTime = performance.now();
    request.duration = request.endTime - request.startTime;
    request.success = success;
    request.cached = cached;
    request.error = error;

    const status = success ? '✅' : '❌';
    const cacheStatus = cached ? '(cached)' : '';
    
    console.log(`${status} [OptimizationTracker] Completed optimization ${id} ${cacheStatus}`, {
      duration: `${request.duration.toFixed(0)}ms`,
      spotsCount: request.spotsCount,
      travelMode: request.travelMode,
      success,
      cached
    });

    // Warn about slow requests
    if (request.duration > this.slowThreshold) {
      console.warn(`⚠️ [OptimizationTracker] Slow optimization: ${request.duration.toFixed(0)}ms`);
    }

    // Track with general performance monitor
    PerformanceMonitor.trackApiCall(
      '/api/itinerary/optimize',
      'POST',
      request.startTime,
      request.endTime,
      success ? 200 : 500,
      undefined,
      cached
    );
  }

  /**
   * Get optimization metrics
   */
  getMetrics(): OptimizationMetrics {
    const completedRequests = this.requests.filter(r => r.endTime !== undefined);
    const totalRequests = completedRequests.length;

    if (totalRequests === 0) {
      return {
        totalRequests: 0,
        averageDuration: 0,
        successRate: 0,
        cacheHitRate: 0,
        slowRequests: 0,
        recentRequests: []
      };
    }

    const successfulRequests = completedRequests.filter(r => r.success);
    const cachedRequests = completedRequests.filter(r => r.cached);
    const slowRequests = completedRequests.filter(r => r.duration! > this.slowThreshold);
    
    const totalDuration = completedRequests.reduce((sum, r) => sum + (r.duration || 0), 0);
    const averageDuration = totalDuration / totalRequests;
    const successRate = (successfulRequests.length / totalRequests) * 100;
    const cacheHitRate = (cachedRequests.length / totalRequests) * 100;

    return {
      totalRequests,
      averageDuration,
      successRate,
      cacheHitRate,
      slowRequests: slowRequests.length,
      recentRequests: this.requests.slice(-10)
    };
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];

    if (metrics.totalRequests === 0) {
      return ['No optimization data available yet'];
    }

    if (metrics.averageDuration > 3000) {
      recommendations.push('Average optimization time is high. Consider reducing the number of spots or using a different travel mode.');
    }

    if (metrics.successRate < 90) {
      recommendations.push('Low success rate detected. Check your internet connection and try again.');
    }

    if (metrics.slowRequests > metrics.totalRequests * 0.2) {
      recommendations.push('Many slow optimizations detected. Consider optimizing fewer spots at once.');
    }

    if (metrics.cacheHitRate < 20) {
      recommendations.push('Low cache usage. Repeated optimizations for similar locations should be faster.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Optimization performance looks good!');
    }

    return recommendations;
  }

  /**
   * Get performance summary for display
   */
  getPerformanceSummary(): {
    status: 'good' | 'warning' | 'poor';
    message: string;
    metrics: OptimizationMetrics;
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const recommendations = this.getRecommendations();

    let status: 'good' | 'warning' | 'poor' = 'good';
    let message = 'Optimization performance is good';

    if (metrics.totalRequests === 0) {
      status = 'good';
      message = 'No optimization data available yet';
    } else if (metrics.successRate < 80 || metrics.averageDuration > 5000) {
      status = 'poor';
      message = 'Optimization performance needs attention';
    } else if (metrics.successRate < 95 || metrics.averageDuration > 3000) {
      status = 'warning';
      message = 'Optimization performance could be improved';
    }

    return {
      status,
      message,
      metrics,
      recommendations
    };
  }

  /**
   * Clear all tracking data
   */
  clear(): void {
    this.requests = [];
    console.log('🧹 [OptimizationTracker] Cleared all tracking data');
  }

  /**
   * Export tracking data for analysis
   */
  export(): string {
    return JSON.stringify({
      requests: this.requests,
      metrics: this.getMetrics(),
      timestamp: Date.now()
    });
  }

  /**
   * Trim old requests to prevent memory leaks
   */
  private trimRequests(): void {
    if (this.requests.length > this.maxRequests) {
      const removed = this.requests.length - this.maxRequests;
      this.requests = this.requests.slice(-this.maxRequests);
      console.log(`🗑️ [OptimizationTracker] Trimmed ${removed} old requests`);
    }
  }
}

// Export singleton instance
export const optimizationTracker = OptimizationPerformanceTracker.getInstance();

/**
 * Hook for React components to track optimization performance
 */
export function useOptimizationPerformance() {
  const startOptimization = (spotsCount: number, travelMode: string) => {
    return optimizationTracker.startOptimization(spotsCount, travelMode);
  };

  const completeOptimization = (
    id: string, 
    success: boolean, 
    cached = false, 
    error?: string
  ) => {
    optimizationTracker.completeOptimization(id, success, cached, error);
  };

  const getMetrics = () => {
    return optimizationTracker.getMetrics();
  };

  const getPerformanceSummary = () => {
    return optimizationTracker.getPerformanceSummary();
  };

  return {
    startOptimization,
    completeOptimization,
    getMetrics,
    getPerformanceSummary
  };
}