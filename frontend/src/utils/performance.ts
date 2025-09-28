/**
 * Performance monitoring utilities for API calls and component rendering
 */

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface ApiCallMetric extends PerformanceMetric {
  url: string;
  method: string;
  status?: number;
  responseSize?: number;
  cached?: boolean;
}

export class PerformanceMonitor {
  private static metrics: Map<string, PerformanceMetric> = new Map();
  private static apiMetrics: ApiCallMetric[] = [];
  private static maxMetrics = 100; // Limit stored metrics to prevent memory leaks

  /**
   * Start measuring performance for a given operation
   */
  static startMeasure(name: string, metadata?: Record<string, any>): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    };
    
    this.metrics.set(id, metric);
    return id;
  }

  /**
   * End measuring performance for a given operation
   */
  static endMeasure(id: string): PerformanceMetric | null {
    const metric = this.metrics.get(id);
    if (!metric) {
      console.warn(`Performance metric not found: ${id}`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    this.metrics.delete(id);
    return metric;
  }

  /**
   * Measure an async operation
   */
  static async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; metric: PerformanceMetric }> {
    const id = this.startMeasure(name, metadata);
    
    try {
      const result = await operation();
      const metric = this.endMeasure(id)!;
      
      // Log slow operations
      if (metric.duration && metric.duration > 1000) {
        console.warn(`Slow operation detected: ${name} took ${metric.duration.toFixed(2)}ms`);
      }
      
      return { result, metric };
    } catch (error) {
      const metric = this.endMeasure(id);
      if (metric) {
        metric.metadata = { ...metric.metadata, error: error instanceof Error ? error.message : 'Unknown error' };
      }
      throw error;
    }
  }

  /**
   * Track API call performance
   */
  static trackApiCall(
    url: string,
    method: string,
    startTime: number,
    endTime: number,
    status?: number,
    responseSize?: number,
    cached = false
  ): void {
    const metric: ApiCallMetric = {
      name: 'api_call',
      url,
      method,
      startTime,
      endTime,
      duration: endTime - startTime,
      status,
      responseSize,
      cached
    };

    this.apiMetrics.push(metric);

    // Limit stored metrics
    if (this.apiMetrics.length > this.maxMetrics) {
      this.apiMetrics.shift();
    }

    // Log slow API calls
    if (metric.duration && metric.duration > 2000) {
      console.warn(`Slow API call: ${method} ${url} took ${metric.duration.toFixed(2)}ms`);
    }
  }

  /**
   * Get performance statistics
   */
  static getStats(): {
    apiCalls: {
      total: number;
      averageDuration: number;
      slowCalls: number;
      cachedCalls: number;
      errorRate: number;
    };
    activeMetrics: number;
  } {
    const apiCalls = this.apiMetrics;
    const total = apiCalls.length;
    
    if (total === 0) {
      return {
        apiCalls: {
          total: 0,
          averageDuration: 0,
          slowCalls: 0,
          cachedCalls: 0,
          errorRate: 0
        },
        activeMetrics: this.metrics.size
      };
    }

    const totalDuration = apiCalls.reduce((sum, call) => sum + (call.duration || 0), 0);
    const averageDuration = totalDuration / total;
    const slowCalls = apiCalls.filter(call => (call.duration || 0) > 2000).length;
    const cachedCalls = apiCalls.filter(call => call.cached).length;
    const errorCalls = apiCalls.filter(call => call.status && call.status >= 400).length;
    const errorRate = errorCalls / total;

    return {
      apiCalls: {
        total,
        averageDuration,
        slowCalls,
        cachedCalls,
        errorRate
      },
      activeMetrics: this.metrics.size
    };
  }

  /**
   * Get recent API calls
   */
  static getRecentApiCalls(limit = 10): ApiCallMetric[] {
    return this.apiMetrics.slice(-limit);
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics.clear();
    this.apiMetrics.length = 0;
  }

  /**
   * Log performance summary to console
   */
  static logSummary(): void {
    const stats = this.getStats();
    console.group('Performance Summary');
    console.log('API Calls:', stats.apiCalls);
    console.log('Active Metrics:', stats.activeMetrics);
    
    if (stats.apiCalls.total > 0) {
      const recentCalls = this.getRecentApiCalls(5);
      console.log('Recent API Calls:', recentCalls);
    }
    
    console.groupEnd();
  }
}

/**
 * React component performance measurement hook
 */
export function usePerformanceMonitor(componentName: string) {
  const measureRender = (renderType: 'mount' | 'update' | 'unmount') => {
    return PerformanceMonitor.startMeasure(`${componentName}_${renderType}`);
  };

  const endMeasure = (id: string) => {
    return PerformanceMonitor.endMeasure(id);
  };

  return { measureRender, endMeasure };
}

/**
 * Image loading performance tracker
 */
export class ImagePerformanceTracker {
  private static loadingImages = new Map<string, number>();

  static startImageLoad(src: string): void {
    this.loadingImages.set(src, performance.now());
  }

  static endImageLoad(src: string, success: boolean): void {
    const startTime = this.loadingImages.get(src);
    if (startTime) {
      const duration = performance.now() - startTime;
      PerformanceMonitor.trackApiCall(
        src,
        'GET',
        startTime,
        performance.now(),
        success ? 200 : 404,
        undefined,
        false
      );
      this.loadingImages.delete(src);

      if (duration > 3000) {
        console.warn(`Slow image load: ${src} took ${duration.toFixed(2)}ms`);
      }
    }
  }

  static getLoadingCount(): number {
    return this.loadingImages.size;
  }
}