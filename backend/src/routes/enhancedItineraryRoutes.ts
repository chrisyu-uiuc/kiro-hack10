/**
 * Enhanced Itinerary Routes
 * API endpoints for Google Maps optimized itineraries
 */

import { Router, Request, Response, NextFunction } from 'express';
import { EnhancedItineraryService, ItineraryOptions } from '../services/EnhancedItineraryService.js';
import { GoogleMapsApiError } from '../services/GoogleMapsService.js';
import { sessionStorage } from '../middleware/sessionStorage.js';
import { ApiResponse, OptimizeItineraryRequest, OptimizeItineraryResponse, ValidationError } from '../types/api.js';

const router = Router();
const enhancedItineraryService = new EnhancedItineraryService();

// Validation functions
const validateSessionId = (sessionId: any): string | null => {
  if (!sessionId || typeof sessionId !== 'string') return 'Session ID is required';
  if (sessionId.trim().length === 0) return 'Session ID cannot be empty';
  if (sessionId.length > 100) return 'Session ID must be less than 100 characters';
  return null;
};



const validateTravelMode = (travelMode: any): string | null => {
  if (travelMode !== undefined && !['walking', 'driving', 'transit'].includes(travelMode)) {
    return 'Travel mode must be walking, driving, or transit';
  }
  return null;
};

const validateStartTime = (startTime: any): string | null => {
  if (startTime !== undefined && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
    return 'Start time must be in HH:MM format (24-hour)';
  }
  return null;
};

const validateVisitDuration = (visitDuration: any): string | null => {
  if (visitDuration !== undefined) {
    const duration = parseInt(visitDuration);
    if (isNaN(duration) || duration < 15 || duration > 480) {
      return 'Visit duration must be between 15 and 480 minutes';
    }
  }
  return null;
};

const validateBoolean = (value: any, fieldName: string): string | null => {
  if (value !== undefined && typeof value !== 'boolean') {
    return `${fieldName} must be a boolean`;
  }
  return null;
};

/**
 * POST /api/itinerary/optimize
 * Generate optimized itinerary with Google Maps integration
 */
router.post('/optimize', async (req: Request<{}, ApiResponse<OptimizeItineraryResponse>, OptimizeItineraryRequest>, res: Response<ApiResponse<OptimizeItineraryResponse>>, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const validationErrors: ValidationError[] = [];
    
    const sessionIdError = validateSessionId(req.body.sessionId);
    if (sessionIdError) validationErrors.push({ field: 'sessionId', message: sessionIdError });
    
    const travelModeError = validateTravelMode(req.body.travelMode);
    if (travelModeError) validationErrors.push({ field: 'travelMode', message: travelModeError });
    
    const startTimeError = validateStartTime(req.body.startTime);
    if (startTimeError) validationErrors.push({ field: 'startTime', message: startTimeError });
    
    const visitDurationError = validateVisitDuration(req.body.visitDuration);
    if (visitDurationError) validationErrors.push({ field: 'visitDuration', message: visitDurationError });
    
    const includeBreaksError = validateBoolean(req.body.includeBreaks, 'Include breaks');
    if (includeBreaksError) validationErrors.push({ field: 'includeBreaks', message: includeBreaksError });
    
    const multiDayError = validateBoolean(req.body.multiDay, 'Multi day');
    if (multiDayError) validationErrors.push({ field: 'multiDay', message: multiDayError });

    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: validationErrors
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { 
      sessionId, 
      travelMode, 
      startTime, 
      visitDuration, 
      includeBreaks,
      multiDay,
      hotelLocation,
      dailyStartTime,
      dailyEndTime
    } = req.body;

    // Verify session exists
    const session = sessionStorage.getSession(sessionId);
    if (!session) {
      res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found. Please start over.'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Get selected spots and city from session (like regular itinerary generation)
    const selectedSpots = session.selectedSpots || [];
    const city = session.city;

    if (!selectedSpots || selectedSpots.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_SPOTS_SELECTED',
          message: 'No spots have been selected. Please select spots first.'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!city) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_CITY_FOUND',
          message: 'No city found in session. Please start over.'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Build options object
    const options: ItineraryOptions = {
      travelMode: travelMode || 'walking',
      startTime: startTime || '09:00',
      visitDuration: visitDuration || 60,
      includeBreaks: includeBreaks !== undefined ? includeBreaks : true,
      multiDay,
      hotelLocation,
      dailyStartTime,
      dailyEndTime
    };

    console.log(`🚀 Generating optimized itinerary for ${selectedSpots.length} spots in ${city}`);
    console.log(`📋 Options:`, options);

    // Convert selectedSpots to proper Spot format with duration
    const spotsWithDuration = selectedSpots.map(spot => ({
      ...spot,
      category: spot.category || 'Unknown',
      location: spot.location || 'Unknown',
      description: spot.description || 'No description available',
      duration: spot.duration || '1-2 hours'
    }));

    // Generate enhanced itinerary
    const result = await enhancedItineraryService.generateEnhancedItinerary(
      sessionId,
      spotsWithDuration,
      city,
      options
    );

    if (result.success && result.itinerary) {
      // Store optimized itinerary in session
      sessionStorage.updateSession(sessionId, { 
        optimizedItinerary: result.itinerary,
        selectedSpots: spotsWithDuration
      });

      res.status(200).json({
        success: true,
        data: {
          itinerary: result.itinerary,
          fallbackUsed: result.fallbackUsed || false,
          sessionId,
          city,
          spotsCount: selectedSpots.length,
          message: result.fallbackUsed 
            ? 'Generated basic itinerary (Google Maps optimization unavailable)'
            : 'Successfully generated optimized itinerary with Google Maps'
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'ITINERARY_GENERATION_ERROR',
          message: result.error || 'Failed to generate optimized itinerary'
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Enhanced itinerary generation error:', error);
    
    // Enhanced error handling for Google Maps API errors
    if (error instanceof GoogleMapsApiError) {
      console.error('Google Maps API Error in route:', {
        apiStatus: error.apiStatus,
        statusCode: error.statusCode,
        quotaExceeded: error.quotaExceeded,
        rateLimited: error.rateLimited
      });
      
      // Return specific error responses for API issues
      if (error.quotaExceeded) {
        res.status(503).json({
          success: false,
          error: {
            code: 'GOOGLE_MAPS_QUOTA_EXCEEDED',
            message: 'Google Maps service is temporarily unavailable. Please try again later.',
            details: { apiStatus: error.apiStatus }
          },
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      if (error.rateLimited) {
        res.status(429).json({
          success: false,
          error: {
            code: 'GOOGLE_MAPS_RATE_LIMITED',
            message: 'Too many requests. Please wait a moment and try again.',
            details: { apiStatus: error.apiStatus, retryAfter: '30 seconds' }
          },
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Other Google Maps API errors
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: 'GOOGLE_MAPS_API_ERROR',
          message: error.message,
          details: { apiStatus: error.apiStatus }
        },
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Pass other errors to error handling middleware
    next({
      status: 500,
      code: 'ENHANCED_ITINERARY_ERROR',
      message: 'Failed to generate enhanced itinerary. Please try again later.',
      originalError: error
    });
  }
});

export default router;