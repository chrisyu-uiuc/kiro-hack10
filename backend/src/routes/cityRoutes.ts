import { Router, Request, Response, NextFunction } from 'express';
import { BedrockAgentService } from '../services/BedrockAgentService.js';
const { body, validationResult } = require('express-validator');
import { sessionStorage } from '../middleware/sessionStorage.js';

const router = Router();
const bedrockService = new BedrockAgentService();

// Validation middleware for city verification
const validateCityInput = [
  body('city')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('City name must be a non-empty string with maximum 100 characters')
    .matches(/^[a-zA-Z0-9\s\-'.,]+$/)
    .withMessage('City name can only contain letters, numbers, spaces, hyphens, apostrophes, commas, and periods'),
];

const validateSpotGenerationInput = [
  body('city')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('City name must be a non-empty string with maximum 100 characters'),
  body('sessionId')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Session ID is required'),
];

const validateSpotSelectionInput = [
  body('selectedSpots')
    .isArray({ min: 1 })
    .withMessage('Selected spots must be a non-empty array'),
  body('selectedSpots.*')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Each selected spot ID must be a non-empty string'),
  body('sessionId')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Session ID is required'),
];

const validateItineraryGenerationInput = [
  body('sessionId')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Session ID is required'),
];

/**
 * POST /api/verify-city
 * Verifies if a city exists using AWS Bedrock Agent
 */
router.post('/verify-city', validateCityInput, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input provided',
          details: errors.array(),
        },
        timestamp: new Date().toISOString(),
      });
    }

    const { city } = req.body;

    // Verify city exists using Bedrock Agent
    const isValid = await bedrockService.verifyCityExists(city);

    if (isValid) {
      return res.status(200).json({
        success: true,
        data: {
          valid: true,
          city: city.trim(),
          message: 'City verified successfully',
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CITY',
          message: `"${city}" is not a recognized city. Please enter a valid city name.`,
        },
        data: {
          valid: false,
          city: city.trim(),
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error in city verification:', error);
    
    // Pass error to error handling middleware
    return next({
      status: 500,
      code: 'CITY_VERIFICATION_ERROR',
      message: 'Failed to verify city. Please try again later.',
      originalError: error,
    });
  }
});

/**
 * POST /api/generate-spots
 * Generates 10-20 recommended spots for a city using AWS Bedrock Agent
 */
router.post('/generate-spots', validateSpotGenerationInput, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input provided',
          details: errors.array(),
        },
        timestamp: new Date().toISOString(),
      });
    }

    const { city, sessionId } = req.body;

    // Get or create session
    let session = sessionStorage.getSession(sessionId);
    if (!session) {
      // Create new session if it doesn't exist
      const newSessionId = sessionStorage.createSession(sessionId);
      session = sessionStorage.getSession(newSessionId);
      if (!session) {
        return next({
          status: 500,
          code: 'SESSION_ERROR',
          message: 'Failed to create session',
        });
      }
    }

    // Update session with city information
    sessionStorage.updateSession(sessionId, { city: city.trim() });

    // Generate spots using Bedrock Agent
    const spots = await bedrockService.generateSpots(city, sessionId);

    // Store spots in session
    sessionStorage.updateSession(sessionId, { allSpots: spots });

    return res.status(200).json({
      success: true,
      data: {
        spots,
        sessionId,
        city: city.trim(),
        message: `Generated ${spots.length} spots for ${city}`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in spot generation:', error);
    
    // Pass error to error handling middleware
    return next({
      status: 500,
      code: 'SPOT_GENERATION_ERROR',
      message: 'Failed to generate spots. Please try again later.',
      originalError: error,
    });
  }
});

/**
 * POST /api/store-selections
 * Stores user's selected spots in session storage
 */
router.post('/store-selections', validateSpotSelectionInput, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input provided',
          details: errors.array(),
        },
        timestamp: new Date().toISOString(),
      });
    }

    const { selectedSpots, sessionId } = req.body;

    // Get session
    const session = sessionStorage.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found. Please start over.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Validate that selected spots exist in the session's all spots
    const validSpotIds = session.allSpots.map(spot => spot.id);
    const invalidSpots = selectedSpots.filter((spotId: string) => !validSpotIds.includes(spotId));
    
    if (invalidSpots.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SPOT_SELECTION',
          message: 'Some selected spots are not valid for this session',
          details: { invalidSpots },
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Filter selected spots from all spots
    const selectedSpotObjects = session.allSpots.filter(spot => selectedSpots.includes(spot.id));

    // Update session with selected spots
    const updateSuccess = sessionStorage.updateSession(sessionId, { 
      selectedSpots: selectedSpotObjects 
    });

    if (!updateSuccess) {
      return next({
        status: 500,
        code: 'SESSION_UPDATE_ERROR',
        message: 'Failed to store selections',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId,
        selectedCount: selectedSpotObjects.length,
        selectedSpots: selectedSpotObjects,
        message: `Successfully stored ${selectedSpotObjects.length} selected spots`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in spot selection storage:', error);
    
    // Pass error to error handling middleware
    return next({
      status: 500,
      code: 'SELECTION_STORAGE_ERROR',
      message: 'Failed to store selections. Please try again later.',
      originalError: error,
    });
  }
});

/**
 * POST /api/generate-itinerary
 * Generates a comprehensive travel itinerary from selected spots using AWS Bedrock Agent
 */
router.post('/generate-itinerary', validateItineraryGenerationInput, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input provided',
          details: errors.array(),
        },
        timestamp: new Date().toISOString(),
      });
    }

    const { sessionId } = req.body;

    // Get session
    const session = sessionStorage.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found. Please start over.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check if there are selected spots
    if (!session.selectedSpots || session.selectedSpots.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_SPOTS_SELECTED',
          message: 'No spots have been selected. Please select spots first.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Generate itinerary using Bedrock Agent
    const itinerary = await bedrockService.generateItinerary(session.selectedSpots, sessionId);

    // Store itinerary in session
    const updateSuccess = sessionStorage.updateSession(sessionId, { itinerary });

    if (!updateSuccess) {
      return next({
        status: 500,
        code: 'SESSION_UPDATE_ERROR',
        message: 'Failed to store itinerary',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId,
        city: session.city,
        itinerary,
        spotsCount: session.selectedSpots.length,
        message: `Successfully generated itinerary for ${session.selectedSpots.length} spots in ${session.city}`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in itinerary generation:', error);
    
    // Pass error to error handling middleware
    return next({
      status: 500,
      code: 'ITINERARY_GENERATION_ERROR',
      message: 'Failed to generate itinerary. Please try again later.',
      originalError: error,
    });
  }
});

export default router;