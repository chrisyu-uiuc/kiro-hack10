import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Create mocks that we can control
const mockVerifyCityExists = vi.fn();
const mockGenerateSpots = vi.fn();
const mockGenerateItinerary = vi.fn();

// Mock the BedrockAgentService module
vi.mock('../../services/BedrockAgentService.js', () => {
  return {
    BedrockAgentService: vi.fn().mockImplementation(() => {
      return {
        verifyCityExists: mockVerifyCityExists,
        generateSpots: mockGenerateSpots,
        generateItinerary: mockGenerateItinerary,
      };
    }),
  };
});

// Mock the session storage
const mockSessionStorage = {
  getSession: vi.fn(),
  createSession: vi.fn(),
  updateSession: vi.fn(),
};

vi.mock('../../middleware/sessionStorage.js', () => {
  return {
    sessionStorage: mockSessionStorage,
  };
});

// Import the route after mocking
const { default: cityRoutes } = await import('../cityRoutes.js');

const app = express();
app.use(express.json());
app.use('/api', cityRoutes);

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

describe('POST /api/verify-city', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset session storage mocks
    mockSessionStorage.getSession.mockReturnValue({
      sessionId: 'test-session',
      city: '',
      allSpots: [],
      selectedSpots: [],
      itinerary: null,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    });
    mockSessionStorage.createSession.mockReturnValue('test-session');
    mockSessionStorage.updateSession.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Valid city verification', () => {
    it('should return success when city is valid', async () => {
      // Arrange
      mockVerifyCityExists.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .post('/api/verify-city')
        .send({ city: 'New York' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          valid: true,
          city: 'New York',
          message: 'City verified successfully',
        },
      });
      expect(response.body.timestamp).toBeDefined();
      expect(mockVerifyCityExists).toHaveBeenCalledWith('New York');
    });

    it('should handle city names with special characters', async () => {
      // Arrange
      mockVerifyCityExists.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .post('/api/verify-city')
        .send({ city: "St. John's" });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.city).toBe("St. John's");
    });

    it('should trim whitespace from city names', async () => {
      // Arrange
      mockVerifyCityExists.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .post('/api/verify-city')
        .send({ city: '  Paris  ' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.city).toBe('Paris');
      expect(mockVerifyCityExists).toHaveBeenCalledWith('Paris');
    });
  });

  describe('Invalid city verification', () => {
    it('should return error when city is invalid', async () => {
      // Arrange
      mockVerifyCityExists.mockResolvedValue(false);

      // Act
      const response = await request(app)
        .post('/api/verify-city')
        .send({ city: 'FakeCity' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_CITY',
          message: '"FakeCity" is not a recognized city. Please enter a valid city name.',
        },
        data: {
          valid: false,
          city: 'FakeCity',
        },
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Input validation', () => {
    it('should return validation error for empty city name', async () => {
      // Act
      const response = await request(app)
        .post('/api/verify-city')
        .send({ city: '' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input provided',
        },
      });
      expect(response.body.error.details).toBeDefined();
      expect(response.body.error.details.length).toBeGreaterThan(0);
    });

    it('should return validation error for missing city field', async () => {
      // Act
      const response = await request(app)
        .post('/api/verify-city')
        .send({});

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for non-string city', async () => {
      // Act
      const response = await request(app)
        .post('/api/verify-city')
        .send({ city: 123 });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for city name with invalid characters', async () => {
      // Act
      const response = await request(app)
        .post('/api/verify-city')
        .send({ city: 'City@#$%' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.some((detail: any) => 
        detail.msg.includes('can only contain letters')
      )).toBe(true);
    });

    it('should return validation error for city name exceeding maximum length', async () => {
      // Act
      const longCityName = 'A'.repeat(101);
      const response = await request(app)
        .post('/api/verify-city')
        .send({ city: longCityName });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should accept city names with valid special characters', async () => {
      // Arrange
      mockVerifyCityExists.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .post('/api/verify-city')
        .send({ city: "New York-Boston, St. Mary's" });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle BedrockAgentService errors gracefully', async () => {
      // Arrange
      mockVerifyCityExists.mockRejectedValue(
        new Error('AWS service unavailable')
      );

      // Act
      const response = await request(app)
        .post('/api/verify-city')
        .send({ city: 'London' });

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'CITY_VERIFICATION_ERROR',
          message: 'Failed to verify city. Please try again later.',
        },
      });
    });

    it('should handle network timeout errors', async () => {
      // Arrange
      mockVerifyCityExists.mockRejectedValue(
        new Error('Request timeout')
      );

      // Act
      const response = await request(app)
        .post('/api/verify-city')
        .send({ city: 'Tokyo' });

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('CITY_VERIFICATION_ERROR');
    });
  });

  describe('Response format', () => {
    it('should include timestamp in all responses', async () => {
      // Arrange
      mockVerifyCityExists.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .post('/api/verify-city')
        .send({ city: 'Berlin' });

      // Assert
      expect(response.body.timestamp).toBeDefined();
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should have consistent error response format', async () => {
      // Act
      const response = await request(app)
        .post('/api/verify-city')
        .send({ city: '' });

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should have consistent success response format', async () => {
      // Arrange
      mockVerifyCityExists.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .post('/api/verify-city')
        .send({ city: 'Madrid' });

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('valid');
      expect(response.body.data).toHaveProperty('city');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/generate-spots', () => {
    const mockSpots = [
      {
        id: 'spot-1',
        name: 'Eiffel Tower',
        category: 'Landmark',
        location: 'Champ de Mars',
        description: 'Iconic iron tower in Paris',
      },
      {
        id: 'spot-2',
        name: 'Louvre Museum',
        category: 'Museum',
        location: '1st Arrondissement',
        description: 'World famous art museum',
      },
    ];

    describe('Successful spot generation', () => {
      it('should generate spots for valid city and session', async () => {
        // Arrange
        mockGenerateSpots.mockResolvedValue(mockSpots);

        // Act
        const response = await request(app)
          .post('/api/generate-spots')
          .send({ city: 'Paris', sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            spots: mockSpots,
            sessionId: 'test-session',
            city: 'Paris',
            message: 'Generated 2 spots for Paris',
          },
        });
        expect(response.body.timestamp).toBeDefined();
        expect(mockGenerateSpots).toHaveBeenCalledWith('Paris', 'test-session');
        expect(mockSessionStorage.updateSession).toHaveBeenCalledWith('test-session', { city: 'Paris' });
        expect(mockSessionStorage.updateSession).toHaveBeenCalledWith('test-session', { allSpots: mockSpots });
      });

      it('should create new session if session does not exist', async () => {
        // Arrange
        mockSessionStorage.getSession.mockReturnValueOnce(null);
        mockSessionStorage.getSession.mockReturnValueOnce({
          sessionId: 'new-session',
          city: '',
          allSpots: [],
          selectedSpots: [],
          itinerary: null,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
        });
        mockSessionStorage.createSession.mockReturnValue('new-session');
        mockGenerateSpots.mockResolvedValue(mockSpots);

        // Act
        const response = await request(app)
          .post('/api/generate-spots')
          .send({ city: 'Tokyo', sessionId: 'non-existent-session' });

        // Assert
        expect(response.status).toBe(200);
        expect(mockSessionStorage.createSession).toHaveBeenCalledWith('non-existent-session');
        expect(mockSessionStorage.getSession).toHaveBeenCalledWith('new-session');
      });

      it('should trim whitespace from city names', async () => {
        // Arrange
        mockGenerateSpots.mockResolvedValue(mockSpots);

        // Act
        const response = await request(app)
          .post('/api/generate-spots')
          .send({ city: '  London  ', sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.city).toBe('London');
        expect(mockGenerateSpots).toHaveBeenCalledWith('London', 'test-session');
        expect(mockSessionStorage.updateSession).toHaveBeenCalledWith('test-session', { city: 'London' });
      });
    });

    describe('Input validation', () => {
      it('should return validation error for empty city name', async () => {
        // Act
        const response = await request(app)
          .post('/api/generate-spots')
          .send({ city: '', sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input provided',
          },
        });
        expect(response.body.error.details).toBeDefined();
      });

      it('should return validation error for missing city field', async () => {
        // Act
        const response = await request(app)
          .post('/api/generate-spots')
          .send({ sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return validation error for missing sessionId field', async () => {
        // Act
        const response = await request(app)
          .post('/api/generate-spots')
          .send({ city: 'Paris' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return validation error for empty sessionId', async () => {
        // Act
        const response = await request(app)
          .post('/api/generate-spots')
          .send({ city: 'Paris', sessionId: '' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return validation error for non-string inputs', async () => {
        // Act
        const response = await request(app)
          .post('/api/generate-spots')
          .send({ city: 123, sessionId: 456 });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('Error handling', () => {
      it('should handle BedrockAgentService errors gracefully', async () => {
        // Arrange
        mockGenerateSpots.mockRejectedValue(new Error('AWS service unavailable'));

        // Act
        const response = await request(app)
          .post('/api/generate-spots')
          .send({ city: 'Berlin', sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(500);
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'SPOT_GENERATION_ERROR',
            message: 'Failed to generate spots. Please try again later.',
          },
        });
      });

      it('should handle session creation failure', async () => {
        // Arrange
        mockSessionStorage.getSession.mockReturnValueOnce(null);
        mockSessionStorage.getSession.mockReturnValueOnce(null);
        mockSessionStorage.createSession.mockReturnValue('new-session');

        // Act
        const response = await request(app)
          .post('/api/generate-spots')
          .send({ city: 'Madrid', sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(500);
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'SESSION_ERROR',
            message: 'Failed to create session',
          },
        });
      });

      it('should handle network timeout errors', async () => {
        // Arrange
        mockGenerateSpots.mockRejectedValue(new Error('Request timeout'));

        // Act
        const response = await request(app)
          .post('/api/generate-spots')
          .send({ city: 'Rome', sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.error.code).toBe('SPOT_GENERATION_ERROR');
      });
    });

    describe('Response format', () => {
      it('should include timestamp in all responses', async () => {
        // Arrange
        mockGenerateSpots.mockResolvedValue(mockSpots);

        // Act
        const response = await request(app)
          .post('/api/generate-spots')
          .send({ city: 'Barcelona', sessionId: 'test-session' });

        // Assert
        expect(response.body.timestamp).toBeDefined();
        expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      });

      it('should have consistent success response format', async () => {
        // Arrange
        mockGenerateSpots.mockResolvedValue(mockSpots);

        // Act
        const response = await request(app)
          .post('/api/generate-spots')
          .send({ city: 'Amsterdam', sessionId: 'test-session' });

        // Assert
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('spots');
        expect(response.body.data).toHaveProperty('sessionId');
        expect(response.body.data).toHaveProperty('city');
        expect(response.body.data).toHaveProperty('message');
        expect(response.body).toHaveProperty('timestamp');
      });

      it('should return spots with correct structure', async () => {
        // Arrange
        mockGenerateSpots.mockResolvedValue(mockSpots);

        // Act
        const response = await request(app)
          .post('/api/generate-spots')
          .send({ city: 'Vienna', sessionId: 'test-session' });

        // Assert
        expect(response.body.data.spots).toHaveLength(2);
        expect(response.body.data.spots[0]).toHaveProperty('id');
        expect(response.body.data.spots[0]).toHaveProperty('name');
        expect(response.body.data.spots[0]).toHaveProperty('category');
        expect(response.body.data.spots[0]).toHaveProperty('location');
        expect(response.body.data.spots[0]).toHaveProperty('description');
      });
    });
  });

  describe('POST /api/store-selections', () => {
    const mockSpots = [
      {
        id: 'spot-1',
        name: 'Eiffel Tower',
        category: 'Landmark',
        location: 'Champ de Mars',
        description: 'Iconic iron tower in Paris',
      },
      {
        id: 'spot-2',
        name: 'Louvre Museum',
        category: 'Museum',
        location: '1st Arrondissement',
        description: 'World famous art museum',
      },
      {
        id: 'spot-3',
        name: 'Notre-Dame Cathedral',
        category: 'Historical Site',
        location: 'Île de la Cité',
        description: 'Gothic cathedral',
      },
    ];

    beforeEach(() => {
      // Set up session with spots
      mockSessionStorage.getSession.mockReturnValue({
        sessionId: 'test-session',
        city: 'Paris',
        allSpots: mockSpots,
        selectedSpots: [],
        itinerary: null,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      });
    });

    describe('Successful selection storage', () => {
      it('should store selected spots successfully', async () => {
        // Arrange
        const selectedSpotIds = ['spot-1', 'spot-3'];

        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ selectedSpots: selectedSpotIds, sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            sessionId: 'test-session',
            selectedCount: 2,
            message: 'Successfully stored 2 selected spots',
          },
        });
        expect(response.body.data.selectedSpots).toHaveLength(2);
        expect(response.body.data.selectedSpots[0]).toMatchObject(mockSpots[0]);
        expect(response.body.data.selectedSpots[1]).toMatchObject(mockSpots[2]);
        expect(response.body.timestamp).toBeDefined();
        expect(mockSessionStorage.updateSession).toHaveBeenCalledWith('test-session', {
          selectedSpots: [mockSpots[0], mockSpots[2]],
        });
      });

      it('should handle single spot selection', async () => {
        // Arrange
        const selectedSpotIds = ['spot-2'];

        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ selectedSpots: selectedSpotIds, sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.selectedCount).toBe(1);
        expect(response.body.data.selectedSpots).toHaveLength(1);
        expect(response.body.data.selectedSpots[0]).toMatchObject(mockSpots[1]);
      });

      it('should handle all spots selection', async () => {
        // Arrange
        const selectedSpotIds = ['spot-1', 'spot-2', 'spot-3'];

        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ selectedSpots: selectedSpotIds, sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.selectedCount).toBe(3);
        expect(response.body.data.selectedSpots).toHaveLength(3);
      });
    });

    describe('Input validation', () => {
      it('should return validation error for empty selectedSpots array', async () => {
        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ selectedSpots: [], sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input provided',
          },
        });
        expect(response.body.error.details).toBeDefined();
      });

      it('should return validation error for missing selectedSpots field', async () => {
        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return validation error for missing sessionId field', async () => {
        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ selectedSpots: ['spot-1'] });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return validation error for empty sessionId', async () => {
        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ selectedSpots: ['spot-1'], sessionId: '' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return validation error for non-array selectedSpots', async () => {
        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ selectedSpots: 'spot-1', sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return validation error for empty spot IDs in array', async () => {
        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ selectedSpots: ['spot-1', ''], sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('Session validation', () => {
      it('should return error when session not found', async () => {
        // Arrange
        mockSessionStorage.getSession.mockReturnValue(null);

        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ selectedSpots: ['spot-1'], sessionId: 'non-existent-session' });

        // Assert
        expect(response.status).toBe(404);
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found. Please start over.',
          },
        });
      });

      it('should return error for invalid spot IDs', async () => {
        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ selectedSpots: ['spot-1', 'invalid-spot'], sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'INVALID_SPOT_SELECTION',
            message: 'Some selected spots are not valid for this session',
            details: { invalidSpots: ['invalid-spot'] },
          },
        });
      });

      it('should return error for multiple invalid spot IDs', async () => {
        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ 
            selectedSpots: ['spot-1', 'invalid-1', 'invalid-2'], 
            sessionId: 'test-session' 
          });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.details.invalidSpots).toEqual(['invalid-1', 'invalid-2']);
      });
    });

    describe('Error handling', () => {
      it('should handle session update failure', async () => {
        // Arrange
        mockSessionStorage.updateSession.mockReturnValue(false);

        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ selectedSpots: ['spot-1'], sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(500);
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'SESSION_UPDATE_ERROR',
            message: 'Failed to store selections',
          },
        });
      });

      it('should handle unexpected errors gracefully', async () => {
        // Arrange
        mockSessionStorage.getSession.mockImplementation(() => {
          throw new Error('Unexpected error');
        });

        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ selectedSpots: ['spot-1'], sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(500);
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'SELECTION_STORAGE_ERROR',
            message: 'Failed to store selections. Please try again later.',
          },
        });
      });
    });

    describe('Response format', () => {
      it('should include timestamp in all responses', async () => {
        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ selectedSpots: ['spot-1'], sessionId: 'test-session' });

        // Assert
        expect(response.body.timestamp).toBeDefined();
        expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      });

      it('should have consistent success response format', async () => {
        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ selectedSpots: ['spot-1'], sessionId: 'test-session' });

        // Assert
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('sessionId');
        expect(response.body.data).toHaveProperty('selectedCount');
        expect(response.body.data).toHaveProperty('selectedSpots');
        expect(response.body.data).toHaveProperty('message');
        expect(response.body).toHaveProperty('timestamp');
      });

      it('should return selected spots with correct structure', async () => {
        // Act
        const response = await request(app)
          .post('/api/store-selections')
          .send({ selectedSpots: ['spot-1'], sessionId: 'test-session' });

        // Assert
        expect(response.body.data.selectedSpots).toHaveLength(1);
        expect(response.body.data.selectedSpots[0]).toHaveProperty('id');
        expect(response.body.data.selectedSpots[0]).toHaveProperty('name');
        expect(response.body.data.selectedSpots[0]).toHaveProperty('category');
        expect(response.body.data.selectedSpots[0]).toHaveProperty('location');
        expect(response.body.data.selectedSpots[0]).toHaveProperty('description');
      });
    });
  });

  describe('POST /api/generate-itinerary', () => {
    const mockSpots = [
      {
        id: 'spot-1',
        name: 'Eiffel Tower',
        category: 'Landmark',
        location: 'Champ de Mars',
        description: 'Iconic iron tower in Paris',
      },
      {
        id: 'spot-2',
        name: 'Louvre Museum',
        category: 'Museum',
        location: '1st Arrondissement',
        description: 'World famous art museum',
      },
    ];

    const mockItinerary = {
      title: 'Paris Adventure',
      totalDuration: '1 day',
      schedule: [
        {
          time: '9:00 AM',
          spot: 'Eiffel Tower',
          duration: '2 hours',
          transportation: 'Metro',
          notes: 'Best views in the morning',
        },
        {
          time: '2:00 PM',
          spot: 'Louvre Museum',
          duration: '3 hours',
          transportation: 'Walking',
          notes: 'Book tickets in advance',
        },
      ],
    };

    beforeEach(() => {
      // Set up session with selected spots
      mockSessionStorage.getSession.mockReturnValue({
        sessionId: 'test-session',
        city: 'Paris',
        allSpots: mockSpots,
        selectedSpots: mockSpots,
        itinerary: null,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      });
    });

    describe('Successful itinerary generation', () => {
      it('should generate itinerary for selected spots successfully', async () => {
        // Arrange
        mockGenerateItinerary.mockResolvedValue(mockItinerary);

        // Act
        const response = await request(app)
          .post('/api/generate-itinerary')
          .send({ sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            sessionId: 'test-session',
            city: 'Paris',
            itinerary: mockItinerary,
            spotsCount: 2,
            message: 'Successfully generated itinerary for 2 spots in Paris',
          },
        });
        expect(response.body.timestamp).toBeDefined();
        expect(mockGenerateItinerary).toHaveBeenCalledWith(mockSpots, 'test-session');
        expect(mockSessionStorage.updateSession).toHaveBeenCalledWith('test-session', { itinerary: mockItinerary });
      });

      it('should handle single spot itinerary generation', async () => {
        // Arrange
        const singleSpot = [mockSpots[0]];
        mockSessionStorage.getSession.mockReturnValue({
          sessionId: 'test-session',
          city: 'Paris',
          allSpots: mockSpots,
          selectedSpots: singleSpot,
          itinerary: null,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
        });
        mockGenerateItinerary.mockResolvedValue(mockItinerary);

        // Act
        const response = await request(app)
          .post('/api/generate-itinerary')
          .send({ sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.spotsCount).toBe(1);
        expect(response.body.data.message).toBe('Successfully generated itinerary for 1 spots in Paris');
        expect(mockGenerateItinerary).toHaveBeenCalledWith(singleSpot, 'test-session');
      });
    });

    describe('Input validation', () => {
      it('should return validation error for missing sessionId field', async () => {
        // Act
        const response = await request(app)
          .post('/api/generate-itinerary')
          .send({});

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input provided',
          },
        });
        expect(response.body.error.details).toBeDefined();
      });

      it('should return validation error for empty sessionId', async () => {
        // Act
        const response = await request(app)
          .post('/api/generate-itinerary')
          .send({ sessionId: '' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should return validation error for non-string sessionId', async () => {
        // Act
        const response = await request(app)
          .post('/api/generate-itinerary')
          .send({ sessionId: 123 });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('Session validation', () => {
      it('should return error when session not found', async () => {
        // Arrange
        mockSessionStorage.getSession.mockReturnValue(null);

        // Act
        const response = await request(app)
          .post('/api/generate-itinerary')
          .send({ sessionId: 'non-existent-session' });

        // Assert
        expect(response.status).toBe(404);
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found. Please start over.',
          },
        });
      });

      it('should return error when no spots are selected', async () => {
        // Arrange
        mockSessionStorage.getSession.mockReturnValue({
          sessionId: 'test-session',
          city: 'Paris',
          allSpots: mockSpots,
          selectedSpots: [],
          itinerary: null,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
        });

        // Act
        const response = await request(app)
          .post('/api/generate-itinerary')
          .send({ sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'NO_SPOTS_SELECTED',
            message: 'No spots have been selected. Please select spots first.',
          },
        });
      });

      it('should return error when selectedSpots is null', async () => {
        // Arrange
        mockSessionStorage.getSession.mockReturnValue({
          sessionId: 'test-session',
          city: 'Paris',
          allSpots: mockSpots,
          selectedSpots: null,
          itinerary: null,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
        });

        // Act
        const response = await request(app)
          .post('/api/generate-itinerary')
          .send({ sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('NO_SPOTS_SELECTED');
      });
    });

    describe('Error handling', () => {
      it('should handle BedrockAgentService errors gracefully', async () => {
        // Arrange
        mockGenerateItinerary.mockRejectedValue(new Error('AWS service unavailable'));

        // Act
        const response = await request(app)
          .post('/api/generate-itinerary')
          .send({ sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(500);
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'ITINERARY_GENERATION_ERROR',
            message: 'Failed to generate itinerary. Please try again later.',
          },
        });
      });

      it('should handle session update failure', async () => {
        // Arrange
        mockGenerateItinerary.mockResolvedValue(mockItinerary);
        mockSessionStorage.updateSession.mockReturnValue(false);

        // Act
        const response = await request(app)
          .post('/api/generate-itinerary')
          .send({ sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(500);
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'SESSION_UPDATE_ERROR',
            message: 'Failed to store itinerary',
          },
        });
      });

      it('should handle network timeout errors', async () => {
        // Arrange
        mockGenerateItinerary.mockRejectedValue(new Error('Request timeout'));

        // Act
        const response = await request(app)
          .post('/api/generate-itinerary')
          .send({ sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(500);
        expect(response.body.error.code).toBe('ITINERARY_GENERATION_ERROR');
      });

      it('should handle unexpected errors gracefully', async () => {
        // Arrange
        mockSessionStorage.getSession.mockImplementation(() => {
          throw new Error('Unexpected error');
        });

        // Act
        const response = await request(app)
          .post('/api/generate-itinerary')
          .send({ sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(500);
        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'ITINERARY_GENERATION_ERROR',
            message: 'Failed to generate itinerary. Please try again later.',
          },
        });
      });
    });

    describe('Response format', () => {
      it('should include timestamp in all responses', async () => {
        // Arrange
        mockGenerateItinerary.mockResolvedValue(mockItinerary);

        // Act
        const response = await request(app)
          .post('/api/generate-itinerary')
          .send({ sessionId: 'test-session' });

        // Assert
        expect(response.body.timestamp).toBeDefined();
        expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
      });

      it('should have consistent success response format', async () => {
        // Arrange
        mockGenerateItinerary.mockResolvedValue(mockItinerary);

        // Act
        const response = await request(app)
          .post('/api/generate-itinerary')
          .send({ sessionId: 'test-session' });

        // Assert
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('sessionId');
        expect(response.body.data).toHaveProperty('city');
        expect(response.body.data).toHaveProperty('itinerary');
        expect(response.body.data).toHaveProperty('spotsCount');
        expect(response.body.data).toHaveProperty('message');
        expect(response.body).toHaveProperty('timestamp');
      });

      it('should return itinerary with correct structure', async () => {
        // Arrange
        mockGenerateItinerary.mockResolvedValue(mockItinerary);

        // Act
        const response = await request(app)
          .post('/api/generate-itinerary')
          .send({ sessionId: 'test-session' });

        // Assert
        expect(response.body.data.itinerary).toHaveProperty('title');
        expect(response.body.data.itinerary).toHaveProperty('totalDuration');
        expect(response.body.data.itinerary).toHaveProperty('schedule');
        expect(response.body.data.itinerary.schedule).toBeInstanceOf(Array);
        expect(response.body.data.itinerary.schedule[0]).toHaveProperty('time');
        expect(response.body.data.itinerary.schedule[0]).toHaveProperty('spot');
        expect(response.body.data.itinerary.schedule[0]).toHaveProperty('duration');
        expect(response.body.data.itinerary.schedule[0]).toHaveProperty('transportation');
        expect(response.body.data.itinerary.schedule[0]).toHaveProperty('notes');
      });
    });
  });

  describe('POST /api/load-more-spots', () => {
    describe('Successful load more spots', () => {
      it('should load more spots for existing session', async () => {
        // Arrange
        const mockMoreSpots = [
          { id: 'more-1', name: 'New Spot 1', category: 'Museum', location: 'District 1', description: 'A new museum' },
          { id: 'more-2', name: 'New Spot 2', category: 'Park', location: 'District 2', description: 'A new park' }
        ];
        
        const mockSession = {
          sessionId: 'test-session',
          city: 'Paris',
          allSpots: [
            { id: 'spot-1', name: 'Existing Spot', category: 'Museum', location: 'Center', description: 'Existing' }
          ]
        };

        mockSessionStorage.getSession.mockReturnValue(mockSession);
        mockSessionStorage.updateSession.mockReturnValue(true);
        
        // Mock the new generateMoreSpots method
        const mockGenerateMoreSpots = vi.fn().mockResolvedValue(mockMoreSpots);
        BedrockAgentService.prototype.generateMoreSpots = mockGenerateMoreSpots;

        // Act
        const response = await request(app)
          .post('/api/load-more-spots')
          .send({ sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.spots).toHaveLength(2);
        expect(response.body.data.spots[0].name).toBe('New Spot 1');
        expect(mockGenerateMoreSpots).toHaveBeenCalledWith('Paris', 'test-session', ['existing spot']);
      });

      it('should handle maximum spots reached (40 spots)', async () => {
        // Arrange
        const mockSession = {
          sessionId: 'test-session',
          city: 'Paris',
          allSpots: new Array(40).fill(null).map((_, i) => ({
            id: `spot-${i}`,
            name: `Spot ${i}`,
            category: 'Museum',
            location: 'Center',
            description: 'Description'
          }))
        };

        mockSessionStorage.getSession.mockReturnValue(mockSession);

        // Act
        const response = await request(app)
          .post('/api/load-more-spots')
          .send({ sessionId: 'test-session' });

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.spots).toHaveLength(0);
        expect(response.body.data.reachedLimit).toBe(true);
        expect(response.body.data.message).toContain('maximum of 40 spots');
      });
    });

    describe('Input validation', () => {
      it('should return validation error for missing sessionId', async () => {
        // Act
        const response = await request(app)
          .post('/api/load-more-spots')
          .send({});

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.message).toBe('Session ID is required');
      });

      it('should return error for non-existent session', async () => {
        // Arrange
        mockSessionStorage.getSession.mockReturnValue(null);

        // Act
        const response = await request(app)
          .post('/api/load-more-spots')
          .send({ sessionId: 'non-existent' });

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
      });
    });
  });
});