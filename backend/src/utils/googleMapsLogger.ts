/**
 * Google Maps API Logging Utility
 * Provides comprehensive logging and monitoring for Google Maps API usage
 */

interface ApiRequestLog {
  timestamp: string;
  requestId: string;
  apiEndpoint: string;
  method: string;
  requestData: any;
  responseStatus?: string;
  responseTime?: number;
  error?: any;
  quotaUsage?: {
    requestCount: number;
    dailyUsage?: number;
  };
}

interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  quotaExceededCount: number;
  rateLimitedCount: number;
  averageResponseTime: number;
  lastRequestTime: string;
}

export class GoogleMapsLogger {
  private static instance: GoogleMapsLogger;
  private requestLogs: ApiRequestLog[] = [];
  private metrics: ApiMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    quotaExceededCount: 0,
    rateLimitedCount: 0,
    averageResponseTime: 0,
    lastRequestTime: ''
  };
  private maxLogEntries = 1000; // Keep last 1000 requests

  private constructor() {}

  public static getInstance(): GoogleMapsLogger {
    if (!GoogleMapsLogger.instance) {
      GoogleMapsLogger.instance = new GoogleMapsLogger();
    }
    return GoogleMapsLogger.instance;
  }

  /**
   * Log an API request
   */
  logRequest(
    apiEndpoint: string,
    method: string,
    requestData: any,
    requestId?: string
  ): string {
    const id = requestId || this.generateRequestId();
    const timestamp = new Date().toISOString();

    const logEntry: ApiRequestLog = {
      timestamp,
      requestId: id,
      apiEndpoint,
      method,
      requestData: this.sanitizeRequestData(requestData)
    };

    this.requestLogs.push(logEntry);
    this.trimLogs();

    console.log(`🗺️ [GoogleMaps-${id}] ${method} ${apiEndpoint}`, {
      timestamp,
      requestData: logEntry.requestData
    });

    this.metrics.totalRequests++;
    this.metrics.lastRequestTime = timestamp;

    return id;
  }

  /**
   * Log an API response
   */
  logResponse(
    requestId: string,
    responseStatus: string,
    responseTime: number,
    error?: any
  ): void {
    const logEntry = this.requestLogs.find(log => log.requestId === requestId);
    if (logEntry) {
      logEntry.responseStatus = responseStatus;
      logEntry.responseTime = responseTime;
      logEntry.error = error;
    }

    const isSuccess = responseStatus === 'OK';
    const isQuotaExceeded = ['OVER_DAILY_LIMIT', 'OVER_QUERY_LIMIT'].includes(responseStatus);
    const isRateLimited = responseStatus === 'OVER_QUERY_LIMIT';

    if (isSuccess) {
      this.metrics.successfulRequests++;
      console.log(`✅ [GoogleMaps-${requestId}] Success - ${responseTime}ms`, {
        status: responseStatus
      });
    } else {
      this.metrics.failedRequests++;
      
      if (isQuotaExceeded) {
        this.metrics.quotaExceededCount++;
        console.error(`🚨 [GoogleMaps-${requestId}] Quota exceeded - ${responseStatus}`, {
          responseTime,
          error
        });
      } else if (isRateLimited) {
        this.metrics.rateLimitedCount++;
        console.warn(`⏱️ [GoogleMaps-${requestId}] Rate limited - ${responseTime}ms`, {
          status: responseStatus
        });
      } else {
        console.error(`❌ [GoogleMaps-${requestId}] Error - ${responseStatus}`, {
          responseTime,
          error
        });
      }
    }

    // Update average response time
    this.updateAverageResponseTime(responseTime);
  }

  /**
   * Log quota and rate limiting information
   */
  logQuotaInfo(requestId: string, quotaUsage: { requestCount: number; dailyUsage?: number }): void {
    const logEntry = this.requestLogs.find(log => log.requestId === requestId);
    if (logEntry) {
      logEntry.quotaUsage = quotaUsage;
    }

    console.log(`📊 [GoogleMaps-${requestId}] Quota usage`, quotaUsage);

    // Warn if approaching limits
    if (quotaUsage.dailyUsage && quotaUsage.dailyUsage > 0.8) {
      console.warn(`⚠️ [GoogleMaps] Daily quota usage at ${(quotaUsage.dailyUsage * 100).toFixed(1)}%`);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): ApiMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent request logs
   */
  getRecentLogs(count: number = 50): ApiRequestLog[] {
    return this.requestLogs.slice(-count);
  }

  /**
   * Get error logs only
   */
  getErrorLogs(count: number = 20): ApiRequestLog[] {
    return this.requestLogs
      .filter(log => log.error || (log.responseStatus && log.responseStatus !== 'OK'))
      .slice(-count);
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: ApiMetrics;
    recentErrors: ApiRequestLog[];
    recommendations: string[];
  } {
    const recentErrors = this.getErrorLogs(10);
    const recommendations: string[] = [];

    // Generate recommendations based on metrics
    if (this.metrics.quotaExceededCount > 0) {
      recommendations.push('Consider upgrading your Google Maps API billing plan or implementing request caching');
    }

    if (this.metrics.rateLimitedCount > this.metrics.totalRequests * 0.1) {
      recommendations.push('Implement request throttling to avoid rate limiting');
    }

    if (this.metrics.averageResponseTime > 2000) {
      recommendations.push('API response times are high. Consider optimizing request patterns or using batch requests');
    }

    const successRate = this.metrics.totalRequests > 0 
      ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
      : 0;

    if (successRate < 95) {
      recommendations.push('API success rate is below 95%. Review error patterns and implement better error handling');
    }

    return {
      summary: this.getMetrics(),
      recentErrors,
      recommendations
    };
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      quotaExceededCount: 0,
      rateLimitedCount: 0,
      averageResponseTime: 0,
      lastRequestTime: ''
    };
    console.log('🔄 [GoogleMaps] Metrics reset');
  }

  /**
   * Clear old logs (useful for memory management)
   */
  clearOldLogs(): void {
    const oldCount = this.requestLogs.length;
    this.requestLogs = this.requestLogs.slice(-this.maxLogEntries);
    const clearedCount = oldCount - this.requestLogs.length;
    
    if (clearedCount > 0) {
      console.log(`🧹 [GoogleMaps] Cleared ${clearedCount} old log entries`);
    }
  }

  private generateRequestId(): string {
    return `gm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeRequestData(data: any): any {
    if (!data) return data;
    
    // Remove sensitive information like API keys
    const sanitized = JSON.parse(JSON.stringify(data));
    
    if (typeof sanitized === 'object') {
      Object.keys(sanitized).forEach(key => {
        if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token')) {
          sanitized[key] = '[REDACTED]';
        }
      });
    }
    
    return sanitized;
  }

  private trimLogs(): void {
    if (this.requestLogs.length > this.maxLogEntries) {
      this.requestLogs = this.requestLogs.slice(-this.maxLogEntries);
    }
  }

  private updateAverageResponseTime(responseTime: number): void {
    const totalRequests = this.metrics.totalRequests;
    if (totalRequests === 1) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime = 
        ((this.metrics.averageResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
    }
  }
}

// Export singleton instance
export const googleMapsLogger = GoogleMapsLogger.getInstance();

// Export types for external use
export type { ApiRequestLog, ApiMetrics };