import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Create a mock that we can control
const mockVerifyCityExists = vi.fn();

// Mock the BedrockAgentService module
vi.mock('../../services/BedrockAgentService.js', () => {
  return {
    BedrockAgentService: vi.fn().mockImplementation(() => {
      return {
        verifyCityExists: mockVerifyCityExists,
      };
    }),
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
});