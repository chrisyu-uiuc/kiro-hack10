import { Router, Request, Response, NextFunction } from 'express';
import { GooglePlacesService } from '../services/GooglePlacesService.js';

const router = Router();

// In-memory cache for spot details (in production, use Redis or similar)
const spotDetailsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Initialize Google Places service
let googlePlacesService: GooglePlacesService | null = null;

// Function to get or create Google Places service
const getGooglePlacesService = (): GooglePlacesService | null => {
  if (googlePlacesService) {
    return googlePlacesService;
  }
  
  try {
    googlePlacesService = new GooglePlacesService();
    return googlePlacesService;
  } catch (error) {
    console.warn('Google Places API not configured:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
};

// Validation functions
const validateSpotId = (spotId: string): string | null => {
  if (!spotId || typeof spotId !== 'string') return 'Spot ID is required';
  if (spotId.trim().length === 0) return 'Spot ID cannot be empty';
  if (spotId.length > 100) return 'Spot ID must be less than 100 characters';
  return null;
};

const validateSpotName = (spotName: string): string | null => {
  if (!spotName || typeof spotName !== 'string') return 'Spot name is required';
  if (spotName.trim().length === 0) return 'Spot name cannot be empty';
  if (spotName.length > 200) return 'Spot name must be less than 200 characters';
  return null;
};

/**
 * GET /api/spots/:spotId/details
 * Fetches detailed information about a specific spot using Google Places API
 */
router.get('/spots/:spotId/details', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { spotId } = req.params;
    const { spotName, spotLocation } = req.query;

    // Validate required parameters
    const spotIdError = validateSpotId(spotId);
    if (spotIdError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: spotIdError,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const spotNameError = validateSpotName(spotName as string);
    if (spotNameError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: spotNameError,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Get Google Places service
    const placesService = getGooglePlacesService();
    if (!placesService) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Google Places API is not configured. Please contact support.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Create cache key
    const cacheKey = `${spotName}-${spotLocation || ''}`.toLowerCase().trim();
    
    // Check cache first
    const cachedData = spotDetailsCache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
      console.log(`📋 Cache hit for spot: ${spotName}`);
      return res.status(200).json({
        success: true,
        data: cachedData.data,
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`🔍 Fetching details for spot: ${spotName} (Location: ${spotLocation || 'N/A'})`);

    // First, find the place by name
    const placeId = await placesService.findPlaceByName(
      spotName as string, 
      spotLocation as string
    );

    if (!placeId) {
      // Return fallback response when place is not found
      const fallbackResponse = {
        spotId,
        name: spotName as string,
        formattedAddress: spotLocation as string || 'Address not available',
        rating: 0,
        userRatingsTotal: 0,
        photos: [],
        reviews: [],
        openingHours: undefined,
        websiteUri: undefined,
        googleMapsUri: `https://www.google.com/maps/search/${encodeURIComponent(spotName as string)}`,
        description: 'Detailed information not available for this location.',
        dataSource: 'fallback'
      };

      return res.status(200).json({
        success: true,
        data: fallbackResponse,
        fallback: true,
        message: 'Basic information provided. Detailed data not available from Google Places.',
        timestamp: new Date().toISOString(),
      });
    }

    // Get detailed place information
    const placeDetails = await placesService.getPlaceDetails(placeId);

    // Add spot ID to the response
    const responseData = {
      ...placeDetails,
      spotId,
      dataSource: 'google_places'
    };

    // Cache the successful response
    spotDetailsCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    console.log(`✅ Successfully fetched details for: ${placeDetails.name}`);

    return res.status(200).json({
      success: true,
      data: responseData,
      cached: false,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching spot details:', error);

    // Handle specific Google Places API errors
    if (error instanceof Error && error.name === 'PlacesApiError') {
      const placesError = error as any;
      
      if (placesError.status === 'OVER_QUERY_LIMIT') {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'API rate limit exceeded. Please try again later.',
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (placesError.status === 'NOT_FOUND') {
        // Return fallback response for not found places
        const { spotId } = req.params;
        const { spotName, spotLocation } = req.query;
        
        const fallbackResponse = {
          spotId,
          name: spotName as string,
          formattedAddress: spotLocation as string || 'Address not available',
          rating: 0,
          userRatingsTotal: 0,
          photos: [],
          reviews: [],
          openingHours: undefined,
          websiteUri: undefined,
          googleMapsUri: `https://www.google.com/maps/search/${encodeURIComponent(spotName as string)}`,
          description: 'Detailed information not available for this location.',
          dataSource: 'fallback'
        };

        return res.status(200).json({
          success: true,
          data: fallbackResponse,
          fallback: true,
          message: 'Place not found in Google Places. Basic information provided.',
          timestamp: new Date().toISOString(),
        });
      }

      return res.status(400).json({
        success: false,
        error: {
          code: 'PLACES_API_ERROR',
          message: placesError.message,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Pass other errors to error handling middleware
    return next({
      status: 500,
      code: 'SPOT_DETAILS_ERROR',
      message: 'Failed to fetch spot details. Please try again later.',
      originalError: error,
    });
  }
});

/**
 * DELETE /api/spots/cache
 * Clears the spot details cache (for development/testing)
 */
router.delete('/spots/cache', (req: Request, res: Response) => {
  const cacheSize = spotDetailsCache.size;
  spotDetailsCache.clear();
  
  return res.status(200).json({
    success: true,
    message: `Cache cleared. Removed ${cacheSize} entries.`,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/spots/cache/stats
 * Returns cache statistics (for development/monitoring)
 */
router.get('/spots/cache/stats', (req: Request, res: Response) => {
  const now = Date.now();
  let validEntries = 0;
  let expiredEntries = 0;

  for (const [key, value] of spotDetailsCache.entries()) {
    if ((now - value.timestamp) < CACHE_TTL) {
      validEntries++;
    } else {
      expiredEntries++;
    }
  }

  return res.status(200).json({
    success: true,
    data: {
      totalEntries: spotDetailsCache.size,
      validEntries,
      expiredEntries,
      cacheTtlHours: CACHE_TTL / (60 * 60 * 1000),
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;