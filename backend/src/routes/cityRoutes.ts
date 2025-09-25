import { Router, Request, Response, NextFunction } from 'express';
import { BedrockAgentService } from '../services/BedrockAgentService.js';
const { body, validationResult } = require('express-validator');

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

export default router;