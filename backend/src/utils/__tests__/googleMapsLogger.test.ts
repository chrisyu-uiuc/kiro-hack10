/**
 * Google Maps Logger Tests
 * Tests for the Google Maps API logging and monitoring utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoogleMapsLogger } from '../googleMapsLogger.js';

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => { });
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => { });

describe('GoogleMapsLogger', () => {
    let logger: GoogleMapsLogger;

    beforeEach(() => {
        logger = GoogleMapsLogger.getInstance();
        logger.resetMetrics();
        vi.clearAllMocks();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const logger1 = GoogleMapsLogger.getInstance();
            const logger2 = GoogleMapsLogger.getInstance();

            expect(logger1).toBe(logger2);
        });
    });

    describe('Request Logging', () => {
        it('should log API requests', () => {
            const requestId = logger.logRequest('Geocoding API', 'GET', { address: 'Tokyo' });

            expect(requestId).toMatch(/^gm-\d+-[a-z0-9]+$/);
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringContaining(`🗺️ [GoogleMaps-${requestId}] GET Geocoding API`),
                expect.any(Object)
            );
        });

        it('should sanitize sensitive data in requests', () => {
            const requestData = {
                address: 'Tokyo',
                key: 'secret-api-key',
                token: 'secret-token'
            };

            logger.logRequest('Geocoding API', 'GET', requestData);

            const logs = logger.getRecentLogs(1);
            expect(logs[0].requestData.key).toBe('[REDACTED]');
            expect(logs[0].requestData.token).toBe('[REDACTED]');
            expect(logs[0].requestData.address).toBe('Tokyo');
        });

        it('should update metrics on request', () => {
            logger.logRequest('Geocoding API', 'GET', { address: 'Tokyo' });

            const metrics = logger.getMetrics();
            expect(metrics.totalRequests).toBe(1);
            expect(metrics.lastRequestTime).toBeTruthy();
        });
    });

    describe('Response Logging', () => {
        it('should log successful responses', () => {
            const requestId = logger.logRequest('Geocoding API', 'GET', { address: 'Tokyo' });
            logger.logResponse(requestId, 'OK', 500);

            const metrics = logger.getMetrics();
            expect(metrics.successfulRequests).toBe(1);
            expect(metrics.failedRequests).toBe(0);
            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringContaining(`✅ [GoogleMaps-${requestId}] Success - 500ms`),
                expect.any(Object)
            );
        });

        it('should log quota exceeded errors', () => {
            const requestId = logger.logRequest('Geocoding API', 'GET', { address: 'Tokyo' });
            logger.logResponse(requestId, 'OVER_DAILY_LIMIT', 200, { error: 'Quota exceeded' });

            const metrics = logger.getMetrics();
            expect(metrics.failedRequests).toBe(1);
            expect(metrics.quotaExceededCount).toBe(1);
            expect(mockConsoleError).toHaveBeenCalledWith(
                expect.stringContaining(`🚨 [GoogleMaps-${requestId}] Quota exceeded`),
                expect.any(Object)
            );
        });

        it('should log rate limiting errors', () => {
            const requestId = logger.logRequest('Geocoding API', 'GET', { address: 'Tokyo' });
            logger.logResponse(requestId, 'OVER_QUERY_LIMIT', 100);

            const metrics = logger.getMetrics();
            expect(metrics.failedRequests).toBe(1);
            expect(metrics.rateLimitedCount).toBe(1);
            expect(mockConsoleWarn).toHaveBeenCalledWith(
                expect.stringContaining(`⏱️ [GoogleMaps-${requestId}] Rate limited`),
                expect.any(Object)
            );
        });

        it('should log general errors', () => {
            const requestId = logger.logRequest('Geocoding API', 'GET', { address: 'Tokyo' });
            logger.logResponse(requestId, 'INVALID_REQUEST', 150, { error: 'Bad request' });

            const metrics = logger.getMetrics();
            expect(metrics.failedRequests).toBe(1);
            expect(mockConsoleError).toHaveBeenCalledWith(
                expect.stringContaining(`❌ [GoogleMaps-${requestId}] Error`),
                expect.any(Object)
            );
        });

        it('should update average response time', () => {
            const requestId1 = logger.logRequest('Geocoding API', 'GET', { address: 'Tokyo' });
            const requestId2 = logger.logRequest('Geocoding API', 'GET', { address: 'Osaka' });

            logger.logResponse(requestId1, 'OK', 400);
            logger.logResponse(requestId2, 'OK', 600);

            const metrics = logger.getMetrics();
            expect(metrics.averageResponseTime).toBe(500);
        });
    });

    describe('Quota Logging', () => {
        it('should log quota usage information', () => {
            const requestId = logger.logRequest('Geocoding API', 'GET', { address: 'Tokyo' });
            logger.logQuotaInfo(requestId, { requestCount: 100, dailyUsage: 0.5 });

            expect(mockConsoleLog).toHaveBeenCalledWith(
                expect.stringContaining(`📊 [GoogleMaps-${requestId}] Quota usage`),
                { requestCount: 100, dailyUsage: 0.5 }
            );
        });

        it('should warn when approaching quota limits', () => {
            const requestId = logger.logRequest('Geocoding API', 'GET', { address: 'Tokyo' });
            logger.logQuotaInfo(requestId, { requestCount: 100, dailyUsage: 0.9 });

            expect(mockConsoleWarn).toHaveBeenCalledWith(
                expect.stringContaining('⚠️ [GoogleMaps] Daily quota usage at 90.0%')
            );
        });
    });

    describe('Metrics and Reporting', () => {
        it('should provide accurate metrics', () => {
            // Log some requests and responses
            const requestId1 = logger.logRequest('Geocoding API', 'GET', { address: 'Tokyo' });
            const requestId2 = logger.logRequest('Distance Matrix API', 'GET', { origins: ['Tokyo'] });
            const requestId3 = logger.logRequest('Routes API', 'POST', { origin: 'Tokyo' });

            logger.logResponse(requestId1, 'OK', 400);
            logger.logResponse(requestId2, 'OVER_DAILY_LIMIT', 200);
            logger.logResponse(requestId3, 'OVER_QUERY_LIMIT', 100);

            const metrics = logger.getMetrics();
            expect(metrics.totalRequests).toBe(3);
            expect(metrics.successfulRequests).toBe(1);
            expect(metrics.failedRequests).toBe(2);
            expect(metrics.quotaExceededCount).toBe(1);
            expect(metrics.rateLimitedCount).toBe(1);
            expect(metrics.averageResponseTime).toBeCloseTo(233.33, 1);
        });

        it('should return recent logs', () => {
            logger.logRequest('Geocoding API', 'GET', { address: 'Tokyo' });
            logger.logRequest('Distance Matrix API', 'GET', { origins: ['Osaka'] });

            const logs = logger.getRecentLogs(2);
            expect(logs).toHaveLength(2);
            expect(logs[0].apiEndpoint).toBe('Geocoding API');
            expect(logs[1].apiEndpoint).toBe('Distance Matrix API');
        });

        it('should return error logs only', () => {
            const requestId1 = logger.logRequest('Geocoding API', 'GET', { address: 'Tokyo' });
            const requestId2 = logger.logRequest('Distance Matrix API', 'GET', { origins: ['Osaka'] });

            logger.logResponse(requestId1, 'OK', 400);
            logger.logResponse(requestId2, 'OVER_DAILY_LIMIT', 200);

            const errorLogs = logger.getErrorLogs();
            expect(errorLogs).toHaveLength(1);
            expect(errorLogs[0].responseStatus).toBe('OVER_DAILY_LIMIT');
        });

        it('should generate comprehensive report', () => {
            // Create some test data
            const requestId1 = logger.logRequest('Geocoding API', 'GET', { address: 'Tokyo' });
            const requestId2 = logger.logRequest('Distance Matrix API', 'GET', { origins: ['Osaka'] });

            logger.logResponse(requestId1, 'OK', 400);
            logger.logResponse(requestId2, 'OVER_DAILY_LIMIT', 200);

            const report = logger.generateReport();

            expect(report.summary.totalRequests).toBe(2);
            expect(report.summary.successfulRequests).toBe(1);
            expect(report.summary.quotaExceededCount).toBe(1);
            expect(report.recentErrors).toHaveLength(1);
            expect(report.recommendations).toContain(
                expect.stringContaining('Consider upgrading your Google Maps API billing plan')
            );
        });

        it('should provide recommendations based on metrics', () => {
            // Simulate high rate limiting
            for (let i = 0; i < 10; i++) {
                const requestId = logger.logRequest('Geocoding API', 'GET', { address: `Location${i}` });
                logger.logResponse(requestId, 'OVER_QUERY_LIMIT', 100);
            }

            const report = logger.generateReport();
            expect(report.recommendations).toContain(
                expect.stringContaining('Implement request throttling')
            );
        });

        it('should recommend optimization for slow responses', () => {
            const requestId = logger.logRequest('Geocoding API', 'GET', { address: 'Tokyo' });
            logger.logResponse(requestId, 'OK', 3000); // 3 seconds

            const report = logger.generateReport();
            expect(report.recommendations).toContain(
                expect.stringContaining('API response times are high')
            );
        });
    });

    describe('Utility Methods', () => {
        it('should reset metrics', () => {
            logger.logRequest('Geocoding API', 'GET', { address: 'Tokyo' });
            logger.resetMetrics();

            const metrics = logger.getMetrics();
            expect(metrics.totalRequests).toBe(0);
            expect(metrics.successfulRequests).toBe(0);
            expect(metrics.failedRequests).toBe(0);
        });

        it('should clear old logs', () => {
            // Add some logs
            for (let i = 0; i < 5; i++) {
                logger.logRequest('Geocoding API', 'GET', { address: `Location${i}` });
            }

            logger.clearOldLogs();

            // Should still have logs since we're under the limit
            const logs = logger.getRecentLogs();
            expect(logs.length).toBe(5);
        });

        it('should trim logs when exceeding max entries', () => {
            // This test would require setting a lower maxLogEntries for testing
            // or adding many entries to exceed the default limit
            const originalMaxEntries = (logger as any).maxLogEntries;
            (logger as any).maxLogEntries = 3;

            // Add more logs than the limit
            for (let i = 0; i < 5; i++) {
                logger.logRequest('Geocoding API', 'GET', { address: `Location${i}` });
            }

            const logs = logger.getRecentLogs();
            expect(logs.length).toBe(3);

            // Restore original limit
            (logger as any).maxLogEntries = originalMaxEntries;
        });
    });
});