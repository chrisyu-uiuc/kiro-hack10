import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BedrockAgentService, Spot } from '../BedrockAgentService';
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';

// Mock the AWS SDK
vi.mock('@aws-sdk/client-bedrock-agent-runtime', () => ({
  BedrockAgentRuntimeClient: vi.fn(),
  InvokeAgentCommand: vi.fn(),
}));

describe('BedrockAgentService', () => {
  let service: BedrockAgentService;
  let mockClient: any;
  let mockSend: any;

  beforeEach(() => {
    // Set up environment variables
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    process.env.BEDROCK_AGENT_ID = 'BTATPBP5VG';
    process.env.BEDROCK_AGENT_ALIAS_ID = 'JFTVDFJYFF';

    // Mock the client
    mockSend = vi.fn();
    mockClient = {
      send: mockSend,
    };
    
    (BedrockAgentRuntimeClient as any).mockImplementation(() => mockClient);
    
    service = new BedrockAgentService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(BedrockAgentRuntimeClient).toHaveBeenCalledWith({
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });
    });

    it('should use default values when environment variables are not set', () => {
      delete process.env.AWS_REGION;
      delete process.env.BEDROCK_AGENT_ID;
      delete process.env.BEDROCK_AGENT_ALIAS_ID;
      
      const newService = new BedrockAgentService();
      
      expect(newService).toBeInstanceOf(BedrockAgentService);
      expect(BedrockAgentRuntimeClient).toHaveBeenCalledWith({
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      });
    });
  });

  describe('invokeAgent', () => {
    it('should successfully invoke agent and return response', async () => {
      const mockResponse = {
        completion: {
          async *[Symbol.asyncIterator]() {
            yield {
              chunk: {
                bytes: new TextEncoder().encode('Test response from agent'),
              },
            };
          },
        },
      };

      mockSend.mockResolvedValue(mockResponse);

      const result = await service.invokeAgent('Test prompt', 'test-session');

      expect(result).toBe('Test response from agent');
      expect(mockSend).toHaveBeenCalledWith(expect.any(InvokeAgentCommand));
      expect(InvokeAgentCommand).toHaveBeenCalledWith({
        agentId: 'BTATPBP5VG',
        agentAliasId: 'JFTVDFJYFF',
        sessionId: 'test-session',
        inputText: 'Test prompt',
      });
    });

    it('should handle multiple chunks in response', async () => {
      const mockResponse = {
        completion: {
          async *[Symbol.asyncIterator]() {
            yield {
              chunk: {
                bytes: new TextEncoder().encode('First part '),
              },
            };
            yield {
              chunk: {
                bytes: new TextEncoder().encode('second part'),
              },
            };
          },
        },
      };

      mockSend.mockResolvedValue(mockResponse);

      const result = await service.invokeAgent('Test prompt', 'test-session');

      expect(result).toBe('First part second part');
    });

    it('should throw error when no completion is received', async () => {
      const mockResponse = {
        completion: null,
      };

      mockSend.mockResolvedValue(mockResponse);

      await expect(service.invokeAgent('Test prompt', 'test-session'))
        .rejects.toThrow('No completion received from Bedrock Agent');
    });

    it('should handle AWS SDK errors', async () => {
      const error = new Error('AWS SDK Error');
      mockSend.mockRejectedValue(error);

      await expect(service.invokeAgent('Test prompt', 'test-session'))
        .rejects.toThrow('Failed to invoke Bedrock Agent: AWS SDK Error');
    });
  });

  describe('verifyCityExists', () => {
    it('should return true for valid city', async () => {
      const mockResponse = {
        completion: {
          async *[Symbol.asyncIterator]() {
            yield {
              chunk: {
                bytes: new TextEncoder().encode('YES, Paris is a valid city.'),
              },
            };
          },
        },
      };

      mockSend.mockResolvedValue(mockResponse);

      const result = await service.verifyCityExists('Paris');

      expect(result).toBe(true);
    });

    it('should return false for invalid city', async () => {
      const mockResponse = {
        completion: {
          async *[Symbol.asyncIterator]() {
            yield {
              chunk: {
                bytes: new TextEncoder().encode('NO, this is not a valid city.'),
              },
            };
          },
        },
      };

      mockSend.mockResolvedValue(mockResponse);

      const result = await service.verifyCityExists('InvalidCity123');

      expect(result).toBe(false);
    });

    it('should handle verification errors', async () => {
      mockSend.mockRejectedValue(new Error('Network error'));

      await expect(service.verifyCityExists('Paris'))
        .rejects.toThrow('Failed to verify city: Failed to invoke Bedrock Agent: Network error');
    });
  });

  describe('generateSpots', () => {
    it('should generate and parse spots correctly', async () => {
      const mockSpotsJson = JSON.stringify([
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
      ]);

      const mockResponse = {
        completion: {
          async *[Symbol.asyncIterator]() {
            yield {
              chunk: {
                bytes: new TextEncoder().encode(`Here are the spots: ${mockSpotsJson}`),
              },
            };
          },
        },
      };

      mockSend.mockResolvedValue(mockResponse);

      const result = await service.generateSpots('Paris', 'test-session');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'spot-1',
        name: 'Eiffel Tower',
        category: 'Landmark',
        location: 'Champ de Mars',
        description: 'Iconic iron tower in Paris',
      });
    });

    it('should handle missing fields in spots data', async () => {
      const mockSpotsJson = JSON.stringify([
        {
          name: 'Eiffel Tower',
          category: 'Landmark',
        },
      ]);

      const mockResponse = {
        completion: {
          async *[Symbol.asyncIterator]() {
            yield {
              chunk: {
                bytes: new TextEncoder().encode(mockSpotsJson),
              },
            };
          },
        },
      };

      mockSend.mockResolvedValue(mockResponse);

      const result = await service.generateSpots('Paris', 'test-session');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'spot-1',
        name: 'Eiffel Tower',
        category: 'Landmark',
        location: 'City Center',
        description: 'No description available',
      });
    });

    it('should handle invalid JSON response with fallback', async () => {
      const mockResponse = {
        completion: {
          async *[Symbol.asyncIterator]() {
            yield {
              chunk: {
                bytes: new TextEncoder().encode('Invalid JSON response'),
              },
            };
          },
        },
      };

      mockSend.mockResolvedValue(mockResponse);

      const result = await service.generateSpots('Paris', 'test-session');
      
      // Should return fallback spots instead of throwing
      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({
        id: 'spot-1',
        name: 'Paris Central Park',
        category: 'Park',
        location: 'City Center',
        description: 'A beautiful central park in the heart of Paris, perfect for relaxation and outdoor activities.',
      });
    });
  });

  describe('generateItinerary', () => {
    const mockSpots: Spot[] = [
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

    it('should generate and parse itinerary correctly', async () => {
      const mockItineraryJson = JSON.stringify({
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
      });

      const mockResponse = {
        completion: {
          async *[Symbol.asyncIterator]() {
            yield {
              chunk: {
                bytes: new TextEncoder().encode(`Here's your itinerary: ${mockItineraryJson}`),
              },
            };
          },
        },
      };

      mockSend.mockResolvedValue(mockResponse);

      const result = await service.generateItinerary(mockSpots, 'test-session');

      expect(result.title).toBe('Paris Adventure');
      expect(result.totalDuration).toBe('1 day');
      expect(result.schedule).toHaveLength(2);
      expect(result.schedule[0]).toEqual({
        time: '9:00 AM',
        spot: 'Eiffel Tower',
        duration: '2 hours',
        transportation: 'Metro',
        notes: 'Best views in the morning',
      });
    });

    it('should handle missing fields in itinerary data', async () => {
      const mockItineraryJson = JSON.stringify({
        schedule: [
          {
            spot: 'Eiffel Tower',
          },
        ],
      });

      const mockResponse = {
        completion: {
          async *[Symbol.asyncIterator]() {
            yield {
              chunk: {
                bytes: new TextEncoder().encode(mockItineraryJson),
              },
            };
          },
        },
      };

      mockSend.mockResolvedValue(mockResponse);

      const result = await service.generateItinerary(mockSpots, 'test-session');

      expect(result.title).toBe('Your Travel Itinerary');
      expect(result.totalDuration).toBe('1 day');
      expect(result.schedule[0]).toEqual({
        time: '9:00 AM',
        spot: 'Eiffel Tower',
        duration: '1 hour',
        transportation: 'Walking',
        notes: '',
      });
    });

    it('should handle invalid JSON response with fallback', async () => {
      const mockResponse = {
        completion: {
          async *[Symbol.asyncIterator]() {
            yield {
              chunk: {
                bytes: new TextEncoder().encode('Invalid JSON response'),
              },
            };
          },
        },
      };

      mockSend.mockResolvedValue(mockResponse);

      const result = await service.generateItinerary(mockSpots, 'test-session');
      
      // Should return fallback itinerary instead of throwing
      expect(result.title).toBe('Your Custom Travel Itinerary');
      expect(result.totalDuration).toBe('4 hours');
      expect(result.schedule).toHaveLength(2);
      expect(result.schedule[0].spot).toBe('Eiffel Tower');
    });
  });
});