/**
 * Monitoring Routes
 * API endpoints for monitoring Google Maps API usage and performance
 */

import { Router, Request, Response } from 'express';
import { googleMapsLogger } from '../utils/googleMapsLogger.js';
import { GoogleMapsService } from '../services/GoogleMapsService.js';
import { geocodingCache } from '../services/GeocodingCache.js';
import { routeOptimizationMonitor } from '../services/RouteOptimizationMonitor.js';

const router = Router();

/**
 * GET /api/monitoring/google-maps/metrics
 * Get Google Maps API usage metrics
 */
router.get('/google-maps/metrics', (_req: Request, res: Response) => {
  try {
    const metrics = googleMapsLogger.getMetrics();
    
    res.status(200).json({
      success: true,
      data: {
        metrics,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching Google Maps metrics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'METRICS_ERROR',
        message: 'Failed to fetch Google Maps API metrics'
      }
    });
  }
});

/**
 * GET /api/monitoring/google-maps/logs
 * Get recent Google Maps API request logs
 */
router.get('/google-maps/logs', (req: Request, res: Response) => {
  try {
    const count = parseInt(req.query.count as string) || 50;
    const errorsOnly = req.query.errors === 'true';
    
    const logs = errorsOnly 
      ? googleMapsLogger.getErrorLogs(count)
      : googleMapsLogger.getRecentLogs(count);
    
    res.status(200).json({
      success: true,
      data: {
        logs,
        count: logs.length,
        errorsOnly,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching Google Maps logs:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGS_ERROR',
        message: 'Failed to fetch Google Maps API logs'
      }
    });
  }
});

/**
 * GET /api/monitoring/google-maps/report
 * Get comprehensive Google Maps API performance report
 */
router.get('/google-maps/report', (_req: Request, res: Response) => {
  try {
    const report = googleMapsLogger.generateReport();
    
    res.status(200).json({
      success: true,
      data: {
        ...report,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating Google Maps report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'REPORT_ERROR',
        message: 'Failed to generate Google Maps API report'
      }
    });
  }
});

/**
 * POST /api/monitoring/google-maps/reset
 * Reset Google Maps API metrics (admin only)
 */
router.post('/google-maps/reset', (req: Request, res: Response) => {
  try {
    // In a production environment, you'd want to add authentication here
    const { confirm } = req.body;
    
    if (confirm !== 'RESET_METRICS') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONFIRMATION',
          message: 'Invalid confirmation. Send { "confirm": "RESET_METRICS" } to reset metrics.'
        }
      });
    }
    
    googleMapsLogger.resetMetrics();
    
    return res.status(200).json({
      success: true,
      data: {
        message: 'Google Maps API metrics have been reset',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error resetting Google Maps metrics:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'RESET_ERROR',
        message: 'Failed to reset Google Maps API metrics'
      }
    });
  }
});

/**
 * GET /api/monitoring/performance/overview
 * Get comprehensive performance overview including cache and optimization metrics
 */
router.get('/performance/overview', (_req: Request, res: Response) => {
  try {
    const googleMapsService = new GoogleMapsService();
    const performanceStats = googleMapsService.getPerformanceStats();
    const googleMapsMetrics = googleMapsLogger.getMetrics();
    
    res.status(200).json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        geocodingCache: performanceStats.geocodingCache,
        routeOptimization: performanceStats.routeOptimization,
        apiMetrics: googleMapsMetrics,
        recommendations: performanceStats.recommendations
      }
    });
  } catch (error) {
    console.error('Error getting performance overview:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PERFORMANCE_ERROR',
        message: 'Failed to retrieve performance overview'
      }
    });
  }
});

/**
 * GET /api/monitoring/performance/cache
 * Get geocoding cache statistics and recent entries
 */
router.get('/performance/cache', (_req: Request, res: Response) => {
  try {
    const cacheStats = geocodingCache.getStats();
    const cacheEntries = geocodingCache.getEntries().slice(0, 10); // Last 10 entries
    
    res.status(200).json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        stats: cacheStats,
        recentEntries: cacheEntries.map(entry => ({
          address: entry.address,
          coordinates: entry.coordinates,
          ageMinutes: Math.round(entry.age / (1000 * 60))
        }))
      }
    });
  } catch (error) {
    console.error('Error getting cache statistics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CACHE_ERROR',
        message: 'Failed to retrieve cache statistics'
      }
    });
  }
});

/**
 * GET /api/monitoring/performance/optimization
 * Get route optimization performance report
 */
router.get('/performance/optimization', (_req: Request, res: Response) => {
  try {
    const report = routeOptimizationMonitor.generateReport();
    
    res.status(200).json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        ...report
      }
    });
  } catch (error) {
    console.error('Error generating optimization report:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'OPTIMIZATION_ERROR',
        message: 'Failed to generate optimization report'
      }
    });
  }
});

/**
 * POST /api/monitoring/performance/clear
 * Clear performance data (cache, optimization metrics, logs)
 */
router.post('/performance/clear', (req: Request, res: Response) => {
  try {
    const { cache, optimization, logs } = req.body;
    const cleared: string[] = [];
    
    if (cache) {
      geocodingCache.clear();
      cleared.push('cache');
    }
    
    if (optimization) {
      routeOptimizationMonitor.clearMetrics();
      cleared.push('optimization');
    }
    
    if (logs) {
      googleMapsLogger.resetMetrics();
      cleared.push('logs');
    }
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Performance data cleared successfully',
        cleared,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error clearing performance data:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CLEAR_ERROR',
        message: 'Failed to clear performance data'
      }
    });
  }
});

/**
 * POST /api/monitoring/performance/preload
 * Preload common locations into geocoding cache
 */
router.post('/performance/preload', async (req: Request, res: Response) => {
  try {
    const { locations } = req.body;
    
    if (!Array.isArray(locations)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'locations must be an array of strings'
        }
      });
    }
    
    const googleMapsService = new GoogleMapsService();
    await googleMapsService.preloadCommonLocations(locations);
    
    return res.status(200).json({
      success: true,
      data: {
        message: `Successfully preloaded ${locations.length} locations`,
        locations,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error preloading locations:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'PRELOAD_ERROR',
        message: 'Failed to preload locations'
      }
    });
  }
});

/**
 * GET /api/monitoring/health
 * Enhanced health check endpoint with performance metrics
 */
router.get('/health', (_req: Request, res: Response) => {
  try {
    const metrics = googleMapsLogger.getMetrics();
    const cacheStats = geocodingCache.getStats();
    const optimizationStats = routeOptimizationMonitor.getStats();
    
    const isHealthy = metrics.totalRequests === 0 || 
      (metrics.successfulRequests / metrics.totalRequests) > 0.8;
    
    res.status(isHealthy ? 200 : 503).json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        googleMapsApi: {
          totalRequests: metrics.totalRequests,
          successRate: metrics.totalRequests > 0 
            ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2) + '%'
            : 'N/A',
          quotaIssues: metrics.quotaExceededCount > 0,
          rateLimitIssues: metrics.rateLimitedCount > 0,
          averageResponseTime: `${metrics.averageResponseTime.toFixed(0)}ms`
        },
        cache: {
          hitRate: `${cacheStats.hitRate.toFixed(1)}%`,
          totalEntries: cacheStats.totalEntries,
          memoryUsage: `${(cacheStats.memoryUsage / 1024).toFixed(1)}KB`
        },
        optimization: {
          totalOptimizations: optimizationStats.totalOptimizations,
          averageTime: `${optimizationStats.averageOptimizationTime.toFixed(0)}ms`,
          successRate: `${optimizationStats.successRate.toFixed(1)}%`
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in health check:', error);
    res.status(503).json({
      success: false,
      data: {
        status: 'error',
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;