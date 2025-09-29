import { Router, Request, Response, NextFunction } from 'express';
import { BedrockAgentService } from '../services/BedrockAgentService.js';
import { sessionStorage } from '../middleware/sessionStorage.js';

// Helper function to calculate string similarity (Levenshtein distance based)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i] + 1, // deletion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}


const router = Router();
const bedrockService = new BedrockAgentService();

// Simple validation functions
const validateCityInput = (city: string): string | null => {
  if (!city || typeof city !== 'string') return 'City name is required';
  if (city.trim().length === 0) return 'City name cannot be empty';
  if (city.length > 100) return 'City name must be less than 100 characters';
  if (!/^[a-zA-Z0-9\s\-'.,]+$/.test(city)) return 'City name contains invalid characters';
  return null;
};

const validateSessionId = (sessionId: string): string | null => {
  if (!sessionId || typeof sessionId !== 'string') return 'Session ID is required';
  if (sessionId.trim().length === 0) return 'Session ID cannot be empty';
  return null;
};

const validateSelectedSpots = (selectedSpots: any): string | null => {
  if (!Array.isArray(selectedSpots)) return 'Selected spots must be an array';
  if (selectedSpots.length === 0) return 'At least one spot must be selected';
  for (const spot of selectedSpots) {
    if (!spot || typeof spot !== 'string' || spot.trim().length === 0) {
      return 'All selected spots must be valid strings';
    }
  }
  return null;
};

/**
 * POST /api/verify-city
 * Verifies if a city exists using AWS Bedrock Agent
 */
router.post('/verify-city', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const cityError = validateCityInput(req.body.city);
    if (cityError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: cityError,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const { city } = req.body;

    // Verify city exists using Bedrock Agent
    const isValid = await bedrockService.verifyCityExists(city);
    console.log(`🔍 City verification result for "${city}": ${isValid}`);

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
      console.log(`❌ Sending error response for invalid city: "${city}"`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CITY',
          message: `"${city}" is not a valid city. Please enter a specific city name (not a country, state, or region).`,
        },
        data: {
          valid: false,
          city: city.trim(),
          suggestion: 'Try entering a specific city like "Tokyo", "Paris", or "New York".'
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
router.post('/generate-spots', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const cityError = validateCityInput(req.body.city);
    const sessionError = validateSessionId(req.body.sessionId);
    if (cityError || sessionError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: cityError || sessionError,
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
 * POST /api/load-more-spots
 * Generates additional spots for a city, avoiding duplicates from existing spots
 */
router.post('/load-more-spots', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const sessionError = validateSessionId(req.body.sessionId);
    if (sessionError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: sessionError,
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

    if (!session.city) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_CITY_SET',
          message: 'No city set in session. Please start over.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check if we've reached the maximum number of spots (40)
    const currentSpotCount = session.allSpots?.length || 0;
    if (currentSpotCount >= 40) {
      return res.status(200).json({
        success: true,
        data: {
          spots: [],
          sessionId,
          city: session.city,
          totalSpots: currentSpotCount,
          reachedLimit: true,
          message: `You've reached the maximum of 40 spots for ${session.city}. That should be plenty for an amazing trip!`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Get existing spot names to avoid duplicates
    const existingSpotNames = session.allSpots?.map(spot => spot.name.toLowerCase()) || [];

    // Generate more spots using Bedrock Agent with exclusion context
    const newSpots = await bedrockService.generateMoreSpots(session.city, sessionId, existingSpotNames);

    // Advanced duplicate detection
    const filteredNewSpots = newSpots.filter(newSpot => {
      const newSpotName = newSpot.name.toLowerCase().trim();
      
      // Remove common words for better comparison
      const normalizeForComparison = (name: string) => {
        return name
          .replace(/\b(the|a|an|of|in|at|on|for|to|and|or)\b/g, '')
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      const normalizedNewName = normalizeForComparison(newSpotName);
      
      return !existingSpotNames.some(existingName => {
        const normalizedExisting = normalizeForComparison(existingName);
        
        // Check for exact matches
        if (existingName === newSpotName || normalizedExisting === normalizedNewName) {
          return true;
        }
        
        // Check for substantial overlap (80% similarity for longer names)
        if (normalizedNewName.length > 8 && normalizedExisting.length > 8) {
          const similarity = calculateSimilarity(normalizedNewName, normalizedExisting);
          if (similarity > 0.8) {
            console.log(`🔍 Filtering similar spot: "${newSpotName}" vs "${existingName}" (${Math.round(similarity * 100)}% similar)`);
            return true;
          }
        }
        
        // Check for one name being contained in another (for shorter names)
        if (normalizedNewName.length > 5 && normalizedExisting.includes(normalizedNewName)) {
          return true;
        }
        if (normalizedExisting.length > 5 && normalizedNewName.includes(normalizedExisting)) {
          return true;
        }
        
        return false;
      });
    });

    console.log(`🔍 Generated ${newSpots.length} new spots, filtered to ${filteredNewSpots.length} unique spots`);

    // Determine if we should try to get more spots or if we've exhausted possibilities
    let finalSpots = filteredNewSpots;
    let noMoreSpots = false;
    
    // If we got very few spots after filtering, try one more attempt
    if (filteredNewSpots.length < 3 && currentSpotCount < 35) {
      console.log(`⚠️ Only got ${filteredNewSpots.length} spots after filtering, trying one more attempt...`);
      
      try {
        // Try a different approach - ask for more diverse/unusual spots
        const diversePrompt = `Generate 10 very unique, unusual, or lesser-known spots in ${session.city} that are completely different from typical tourist attractions. Focus on: local secrets, hidden gems, unusual experiences, off-the-beaten-path locations, local-only spots, unique cultural experiences, or quirky attractions that only locals know about.`;
        
        const supplementarySpots = await bedrockService.invokeAgent(diversePrompt, `${sessionId}-diverse-${Date.now()}`);
        
        // Try to parse as JSON, but if it fails, we'll just use what we have
        let additionalSpots: any[] = [];
        try {
          const jsonMatch = supplementarySpots.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            additionalSpots = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.log('Could not parse diverse spots response, using existing spots only');
        }
        
        if (additionalSpots.length > 0) {
          const processedAdditional = additionalSpots.map((spot: any, index: number) => ({
            id: `diverse-${Date.now()}-${index + 1}`,
            name: spot.name || `Unique Spot ${index + 1}`,
            category: spot.category || 'Local Experience',
            location: spot.location || 'Hidden Location',
            description: spot.description || 'A unique local experience',
            duration: spot.duration || '1-2 hours',
          }));
          
          // Apply the same duplicate filtering
          const uniqueAdditional = processedAdditional.filter(newSpot => {
            const newSpotName = newSpot.name.toLowerCase().trim();
            const normalizeForComparison = (name: string) => {
              return name
                .replace(/\b(the|a|an|of|in|at|on|for|to|and|or)\b/g, '')
                .replace(/[^\w\s]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            };
            
            const normalizedNewName = normalizeForComparison(newSpotName);
            const allExistingNames = [...existingSpotNames, ...filteredNewSpots.map(s => s.name.toLowerCase())];
            
            return !allExistingNames.some(existingName => {
              const normalizedExisting = normalizeForComparison(existingName);
              
              if (existingName === newSpotName || normalizedExisting === normalizedNewName) {
                return true;
              }
              
              if (normalizedNewName.length > 8 && normalizedExisting.length > 8) {
                const similarity = calculateSimilarity(normalizedNewName, normalizedExisting);
                if (similarity > 0.8) {
                  return true;
                }
              }
              
              return false;
            });
          });
          
          finalSpots = [...filteredNewSpots, ...uniqueAdditional.slice(0, 8 - filteredNewSpots.length)];
          console.log(`🔍 Added ${uniqueAdditional.length} diverse spots, total: ${finalSpots.length}`);
        }
      } catch (error) {
        console.log('Failed to generate diverse spots, using existing spots only');
      }
    }
    
    // If we still have very few spots and we've tried multiple approaches, mark as no more spots
    if (finalSpots.length < 2 && currentSpotCount > 15) {
      noMoreSpots = true;
      console.log(`🚫 Marking as no more spots available (got ${finalSpots.length} spots, total ${currentSpotCount})`);
    }

    if (finalSpots.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          spots: [],
          sessionId,
          city: session.city,
          totalSpots: currentSpotCount,
          noMoreSpots: true,
          message: 'No new unique spots found. You may have seen all available recommendations for this city.',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Append new spots to existing ones in session
    const updatedAllSpots = [...(session.allSpots || []), ...finalSpots];
    sessionStorage.updateSession(sessionId, { allSpots: updatedAllSpots });

    return res.status(200).json({
      success: true,
      data: {
        spots: finalSpots,
        sessionId,
        city: session.city,
        totalSpots: updatedAllSpots.length,
        noMoreSpots: noMoreSpots,
        message: noMoreSpots 
          ? `Generated ${finalSpots.length} new spots. This may be all unique spots available for ${session.city}.`
          : `Generated ${finalSpots.length} new spots for ${session.city}`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in loading more spots:', error);

    // Pass error to error handling middleware
    return next({
      status: 500,
      code: 'LOAD_MORE_SPOTS_ERROR',
      message: 'Failed to load more spots. Please try again later.',
      originalError: error,
    });
  }
});

/**
 * POST /api/store-selections
 * Stores user's selected spots in session storage
 */
router.post('/store-selections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const sessionError = validateSessionId(req.body.sessionId);
    const spotsError = validateSelectedSpots(req.body.selectedSpots);
    if (sessionError || spotsError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: sessionError || spotsError,
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
router.post('/generate-itinerary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const sessionError = validateSessionId(req.body.sessionId);
    if (sessionError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: sessionError,
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

    // Generate optimized itinerary using Google Maps integration
    const { EnhancedItineraryService } = await import('../services/EnhancedItineraryService.js');
    const enhancedItineraryService = new EnhancedItineraryService();
    
    console.log(`🚀 Generating optimized itinerary for ${session.selectedSpots.length} spots in ${session.city}`);
    
    const result = await enhancedItineraryService.generateEnhancedItinerary(
      sessionId,
      session.selectedSpots, // Use the existing selectedSpots from session
      session.city || 'Unknown City',
      {
        travelMode: 'walking',
        startTime: '09:00',
        visitDuration: 60,
        includeBreaks: true
      }
    );
    
    let itinerary;
    if (result.success && result.itinerary) {
      // Convert OptimizedItinerary to regular Itinerary for session storage
      itinerary = {
        title: result.itinerary.title,
        totalDuration: result.itinerary.totalDuration,
        schedule: result.itinerary.schedule.map(item => ({
          time: item.time,
          spot: item.spot,
          duration: item.duration,
          transportation: item.transportation || '',
          notes: item.notes || ''
        }))
      };
      console.log(`✅ Successfully generated optimized itinerary with real travel times`);
    } else {
      console.log(`⚠️ Optimized itinerary failed, falling back to basic Bedrock itinerary`);
      // Fallback to basic Bedrock itinerary if optimization fails
      itinerary = await bedrockService.generateItinerary(session.selectedSpots, sessionId);
    }

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