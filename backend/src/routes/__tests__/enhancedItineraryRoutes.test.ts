import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
// import { EnhancedItineraryService } from '../../services/EnhancedItineraryService.js';
import { GoogleMapsApiError } from '../../services/GoogleMapsService.js';

// Create mocks for the services
const mockGenerateEnhancedItinerary = vi.fn();

// Mock the EnhancedItineraryService
vi.mock('../../services/EnhancedItineraryService.js', () => {
  return {
    EnhancedItineraryService: vi.fn().mockImplementation(() => {
      return {
        generateEnhancedItinerary: mockGenerateEnhancedItinerary,
      };
    }),
  };
});

// Mock the session storage
const mockSessionStorage = {
  getSession: vi.fn(),
  updateSession: vi.fn(),
};

vi.mock('../../middleware/sessionStorage.js', () => {
  return {
    sessionStorage: mockSessionStorage,
  };
});

// Import the route after mocking
const { default: enhancedItineraryRoutes } = await import('../enhancedItineraryRoutes.js');

const app = express();
app.use(express.json());
app.use('/api/itinerary', enhancedItineraryRoutes);

// Add error handling middleware for tests
app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
    },
    timestamp: new Date().toISOString(),
  });
});

describe('Enhanced Itinerary Routes Integration Tests', () => {
  const mockSpots = [
    {
      id: 'spot-1',
      name: 'Tokyo Tower',
      category: 'Landmark',
      location: 'Minato',
      description: 'Iconic tower with city views',
      duration: '1-2 hours'
    },
    {
      id: 'spot-2',
      name: 'Senso-ji Temple',
      category: 'Religious Site',
      location: 'Asakusa',
      description: 'Historic Buddhist temple',
      duration: '1 hour'
    }
  ];

  const mockSession = {
    sessionId: 'test-session-123',
    city: 'Tokyo',
    allSpots: mockSpots,
    selectedSpots: [],
    itinerary: null,
    createdAt: new Date(),
    lastAccessedAt: new Date(),
  };

  const mockOptimizedItinerary = {
    title: 'Smart Tokyo Itinerary - Walking',
    totalDuration: '4 hours',
    totalTravelTime: '30 mins',
    schedule: [
      {
        time: '09:00',
        spot: 'Tokyo Tower',
        duration: '60 mins',
        arrivalTime: '09:00',
        departureTime: '10:00',
        navigationUrl: 'https://maps.google.com/directions?destination=Tokyo+Tower'
      },
      {
        time: '10:15',
        spot: 'Senso-ji Temple',
        duration: '60 mins',
        arrivalTime: '10:15',
        departureTime: '11:15',
        navigationUrl: 'https://maps.google.com/directions?destination=Senso-ji+Temple'
      }
    ],
    route: {
      orderedSpots: ['Tokyo Tower', 'Senso-ji Temple'],
      totalTravelTime: 1800,
      totalDistance: 5000,
      routeSteps: []
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default session setup
    mockSessionStorage.getSession.mockReturnValue(mockSession);
    mockSessionStorage.updateSession.mockReturnValue(true);
    
    // Default successful itinerary generation
    mockGenerateEnhancedItinerary.mockResolvedValue({
      success: true,
      itinerary: mockOptimizedItinerary,
      fallbackUsed: false
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/itinerary/optimize - Successful Optimization', () => {
    const validRequestBody = {
      sessionId: 'test-session-123',
      selectedSpots: [
        { id: 'spot-1', name: 'Tokyo Tower' },
        { id: 'spot-2', name: 'Senso-ji Temple' }
      ],
      city: 'Tokyo',
      travelMode: 'walking' as const
    };

    it('should generate optimized itinerary successfully', async () => {
      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(validRequestBody)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          itinerary: mockOptimizedItinerary,
          fallbackUsed: false,
          sessionId: 'test-session-123',
          city: 'Tokyo',
          spotsCount: 2,
          message: 'Successfully generated optimized itinerary with Google Maps'
        }
      });
      expect(response.body.timestamp).toBeDefined();
      
      // Verify service was called with correct parameters
      expect(mockGenerateEnhancedItinerary).toHaveBeenCalledWith(
        'test-session-123',
        expect.arrayContaining([
          expect.objectContaining({ id: 'spot-1', name: 'Tokyo Tower' }),
          expect.objectContaining({ id: 'spot-2', name: 'Senso-ji Temple' })
        ]),
        'Tokyo',
        expect.objectContaining({
          travelMode: 'walking',
          startTime: '09:00',
          visitDuration: 60,
          includeBreaks: true
        })
      );
      
      // Verify session was updated
      expect(mockSessionStorage.updateSession).toHaveBeenCalledWith('test-session-123', {
        optimizedItinerary: mockOptimizedItinerary,
        selectedSpots: expect.any(Array)
      });
    });

    it('should handle fallback itinerary when optimization fails', async () => {
      // Mock fallback scenario
      mockGenerateEnhancedItinerary.mockResolvedValueOnce({
        success: true,
        itinerary: { ...mockOptimizedItinerary, title: 'Basic Tokyo Itinerary' },
        fallbackUsed: true
      });

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(validRequestBody)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          fallbackUsed: true,
          message: 'Generated basic itinerary (Google Maps optimization unavailable)'
        }
      });
    });

    it('should handle optional parameters correctly', async () => {
      const bodyWithOptions = {
        ...validRequestBody,
        startTime: '10:30',
        visitDuration: 90,
        includeBreaks: false,
        multiDay: true,
        hotelLocation: 'Shibuya Hotel',
        dailyStartTime: '08:00',
        dailyEndTime: '20:00'
      };

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(bodyWithOptions)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockGenerateEnhancedItinerary).toHaveBeenCalledWith(
        'test-session-123',
        expect.any(Array),
        'Tokyo',
        expect.objectContaining({
          travelMode: 'walking',
          startTime: '10:30',
          visitDuration: 90,
          includeBreaks: false,
          multiDay: true,
          hotelLocation: 'Shibuya Hotel',
          dailyStartTime: '08:00',
          dailyEndTime: '20:00'
        })
      );
    });
  });

  describe('POST /api/itinerary/optimize - Travel Mode Testing', () => {
    const baseRequest = {
      sessionId: 'test-session-123',
      selectedSpots: [
        { id: 'spot-1', name: 'Tokyo Tower' },
        { id: 'spot-2', name: 'Senso-ji Temple' }
      ],
      city: 'Tokyo'
    };

    it('should optimize with walking mode', async () => {
      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send({ ...baseRequest, travelMode: 'walking' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockGenerateEnhancedItinerary).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ travelMode: 'walking' })
      );
    });

    it('should optimize with driving mode', async () => {
      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send({ ...baseRequest, travelMode: 'driving' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockGenerateEnhancedItinerary).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ travelMode: 'driving' })
      );
    });

    it('should optimize with transit mode', async () => {
      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send({ ...baseRequest, travelMode: 'transit' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockGenerateEnhancedItinerary).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ travelMode: 'transit' })
      );
    });

    it('should default to walking when no travel mode specified', async () => {
      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(baseRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockGenerateEnhancedItinerary).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({ travelMode: 'walking' })
      );
    });
  });

  describe('POST /api/itinerary/optimize - Validation Error Tests', () => {
    const validRequestBody = {
      sessionId: 'test-session-123',
      selectedSpots: [
        { id: 'spot-1', name: 'Tokyo Tower' },
        { id: 'spot-2', name: 'Senso-ji Temple' }
      ],
      city: 'Tokyo',
      travelMode: 'walking' as const
    };

    it('should return validation error for missing sessionId', async () => {
      const invalidBody: any = { ...validRequestBody };
      delete invalidBody.sessionId;

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(invalidBody)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'sessionId',
              message: 'Session ID is required'
            })
          ])
        }
      });
    });

    it('should return validation error for empty selectedSpots array', async () => {
      const invalidBody = { ...validRequestBody, selectedSpots: [] };

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(invalidBody)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'selectedSpots',
              message: 'At least one spot must be selected'
            })
          ])
        }
      });
    });

    it('should return validation error for missing city', async () => {
      const invalidBody: any = { ...validRequestBody };
      delete invalidBody.city;

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(invalidBody)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'city',
              message: 'City is required'
            })
          ])
        }
      });
    });

    it('should return validation error for invalid travel mode', async () => {
      const invalidBody = { ...validRequestBody, travelMode: 'flying' };

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(invalidBody)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'travelMode',
              message: 'Travel mode must be walking, driving, or transit'
            })
          ])
        }
      });
    });

    it('should return validation error for invalid start time format', async () => {
      const invalidBody = { ...validRequestBody, startTime: '25:00' };

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(invalidBody)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'startTime',
              message: 'Start time must be in HH:MM format (24-hour)'
            })
          ])
        }
      });
    });

    it('should return validation error for invalid visit duration', async () => {
      const invalidBody = { ...validRequestBody, visitDuration: 10 };

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(invalidBody)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'visitDuration',
              message: 'Visit duration must be between 15 and 480 minutes'
            })
          ])
        }
      });
    });

    it('should return validation error for too many spots', async () => {
      const tooManySpots = Array.from({ length: 25 }, (_, i) => ({
        id: `spot-${i}`,
        name: `Spot ${i}`
      }));
      
      const invalidBody = { ...validRequestBody, selectedSpots: tooManySpots };

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(invalidBody)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'selectedSpots',
              message: 'Maximum 20 spots allowed'
            })
          ])
        }
      });
    });

    it('should return validation error for spots with missing required fields', async () => {
      const invalidSpots = [
        { id: 'spot-1' }, // Missing name
        { name: 'Spot 2' } // Missing id
      ];
      
      const invalidBody = { ...validRequestBody, selectedSpots: invalidSpots };

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(invalidBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/itinerary/optimize - Session and Spot Validation', () => {
    const validRequestBody = {
      sessionId: 'test-session-123',
      selectedSpots: [
        { id: 'spot-1', name: 'Tokyo Tower' },
        { id: 'spot-2', name: 'Senso-ji Temple' }
      ],
      city: 'Tokyo',
      travelMode: 'walking' as const
    };

    it('should return error when session not found', async () => {
      mockSessionStorage.getSession.mockReturnValueOnce(null);

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(validRequestBody)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found. Please start over.'
        }
      });
    });

    it('should return error for invalid spot selection', async () => {
      const invalidRequestBody = {
        ...validRequestBody,
        selectedSpots: [
          { id: 'spot-1', name: 'Tokyo Tower' },
          { id: 'invalid-spot', name: 'Invalid Spot' }
        ]
      };

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(invalidRequestBody)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_SPOT_SELECTION',
          message: 'Some selected spots are not valid for this session',
          details: { invalidSpots: ['invalid-spot'] }
        }
      });
    });
  });

  describe('POST /api/itinerary/optimize - Error Handling', () => {
    const validRequestBody = {
      sessionId: 'test-session-123',
      selectedSpots: [
        { id: 'spot-1', name: 'Tokyo Tower' },
        { id: 'spot-2', name: 'Senso-ji Temple' }
      ],
      city: 'Tokyo',
      travelMode: 'walking' as const
    };

    it('should handle itinerary generation failure', async () => {
      mockGenerateEnhancedItinerary.mockResolvedValueOnce({
        success: false,
        error: 'Failed to generate itinerary'
      });

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(validRequestBody)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ITINERARY_GENERATION_ERROR',
          message: 'Failed to generate itinerary'
        }
      });
    });

    it('should handle Google Maps quota exceeded error', async () => {
      const quotaError = new GoogleMapsApiError(
        'Quota exceeded',
        'OVER_QUERY_LIMIT',
        503
      );
      
      mockGenerateEnhancedItinerary.mockRejectedValueOnce(quotaError);

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(validRequestBody)
        .expect(503);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'GOOGLE_MAPS_QUOTA_EXCEEDED',
          message: 'Google Maps service is temporarily unavailable. Please try again later.',
          details: { apiStatus: 'OVER_QUERY_LIMIT' }
        }
      });
    });

    it('should handle Google Maps rate limiting error', async () => {
      // Since OVER_QUERY_LIMIT sets both quotaExceeded and rateLimited to true,
      // and quotaExceeded is checked first, this will return 503 with quota exceeded error
      const rateLimitError = new GoogleMapsApiError(
        'Rate limited',
        'OVER_QUERY_LIMIT',
        429
      );
      
      mockGenerateEnhancedItinerary.mockRejectedValueOnce(rateLimitError);

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(validRequestBody)
        .expect(503);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'GOOGLE_MAPS_QUOTA_EXCEEDED',
          message: 'Google Maps service is temporarily unavailable. Please try again later.',
          details: { 
            apiStatus: 'OVER_QUERY_LIMIT'
          }
        }
      });
    });

    it('should handle other Google Maps API errors', async () => {
      const apiError = new GoogleMapsApiError(
        'Invalid request',
        'INVALID_REQUEST',
        400
      );
      
      mockGenerateEnhancedItinerary.mockRejectedValueOnce(apiError);

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(validRequestBody)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'GOOGLE_MAPS_API_ERROR',
          message: 'Invalid request',
          details: { apiStatus: 'INVALID_REQUEST' }
        }
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      mockGenerateEnhancedItinerary.mockRejectedValueOnce(new Error('Unexpected error'));

      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(validRequestBody)
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ENHANCED_ITINERARY_ERROR',
          message: 'Failed to generate enhanced itinerary. Please try again later.'
        }
      });
    });
  });

  describe('Response Format Consistency', () => {
    const validRequestBody = {
      sessionId: 'test-session-123',
      selectedSpots: [
        { id: 'spot-1', name: 'Tokyo Tower' }
      ],
      city: 'Tokyo'
    };

    it('should include timestamp in all responses', async () => {
      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(validRequestBody)
        .expect(200);

      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should have consistent success response format', async () => {
      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send(validRequestBody)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('itinerary');
      expect(response.body.data).toHaveProperty('fallbackUsed');
      expect(response.body.data).toHaveProperty('sessionId');
      expect(response.body.data).toHaveProperty('city');
      expect(response.body.data).toHaveProperty('spotsCount');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should have consistent error response format', async () => {
      const response = await request(app)
        .post('/api/itinerary/optimize')
        .send({ ...validRequestBody, sessionId: '' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});