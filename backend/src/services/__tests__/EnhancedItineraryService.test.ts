import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnhancedItineraryService } from '../EnhancedItineraryService.js';
import { Spot } from '../BedrockAgentService.js';
import { GoogleMapsApiError } from '../GoogleMapsService.js';

// Mock the services
vi.mock('../BedrockAgentService.js');
vi.mock('../GoogleMapsService.js');

describe('EnhancedItineraryService', () => {
  let service: EnhancedItineraryService;
  let mockBedrockService: any;
  let mockMapsService: any;

  const mockSpots: Spot[] = [
    {
      id: 'spot-1',
      name: 'Tokyo Tower',
      category: 'Viewpoint',
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

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock BedrockAgentService
    mockBedrockService = {
      generateItinerary: vi.fn()
    };
    
    // Mock GoogleMapsService
    mockMapsService = {
      createOptimizedItinerary: vi.fn()
    };

    // Create service instance
    service = new EnhancedItineraryService();
    
    // Replace the private services with mocks
    (service as any).bedrockService = mockBedrockService;
    (service as any).mapsService = mockMapsService;
  });

  describe('validateOptions', () => {
    it('should validate correct options', () => {
      const options = {
        travelMode: 'walking' as const,
        startTime: '09:00',
        visitDuration: 60,
        includeBreaks: true
      };

      const result = service.validateOptions(options);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid start time', () => {
      const options = {
        startTime: '25:00'
      };

      const result = service.validateOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid start time format. Use HH:MM format.');
    });

    it('should reject invalid visit duration', () => {
      const options = {
        visitDuration: 10 // Too short
      };

      const result = service.validateOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Visit duration must be between 15 minutes and 8 hours.');
    });

    it('should reject invalid travel mode', () => {
      const options = {
        travelMode: 'flying' as any
      };

      const result = service.validateOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Travel mode must be walking, driving, or transit.');
    });
  });

  describe('generateOptimizedItinerary', () => {
    it('should generate enhanced itinerary successfully', async () => {
      // Mock successful responses
      const mockBedrockItinerary = {
        title: 'Tokyo Itinerary',
        totalDuration: '6 hours',
        schedule: [
          {
            time: '09:00',
            spot: 'Tokyo Tower',
            duration: '2 hours',
            transportation: 'Walking',
            notes: 'Best views in the morning'
          }
        ]
      };

      const mockOptimizedItinerary = {
        title: 'Optimized Tokyo Itinerary',
        totalDuration: '6 hours',
        totalTravelTime: '30 mins',
        schedule: [
          {
            time: '09:00',
            spot: 'Tokyo Tower',
            duration: '60 mins',
            arrivalTime: '09:00',
            departureTime: '10:00'
          }
        ],
        route: {
          orderedSpots: ['Tokyo Tower', 'Senso-ji Temple'],
          totalTravelTime: 1800,
          totalDistance: 5000,
          routeSteps: []
        }
      };

      mockBedrockService.generateItinerary.mockResolvedValue(mockBedrockItinerary);
      mockMapsService.createOptimizedItinerary.mockResolvedValue(mockOptimizedItinerary);

      const result = await service.generateOptimizedItinerary(
        'test-session',
        mockSpots,
        'Tokyo',
        { travelMode: 'walking', includeBreaks: false }
      );

      expect(result.title).toContain('Smart Tokyo Itinerary');
      expect(result.schedule).toBeDefined();
      expect(mockBedrockService.generateItinerary).toHaveBeenCalledWith(mockSpots, 'test-session');
      expect(mockMapsService.createOptimizedItinerary).toHaveBeenCalledWith(
        ['Tokyo Tower', 'Senso-ji Temple'],
        'Tokyo',
        'walking',
        '09:00'
      );
    });

    it('should fallback to basic itinerary on Google Maps failure', async () => {
      // Mock Bedrock success but Google Maps failure
      const mockBedrockItinerary = {
        title: 'Tokyo Itinerary',
        totalDuration: '6 hours',
        schedule: [
          {
            time: '09:00',
            spot: 'Tokyo Tower',
            duration: '2 hours',
            transportation: 'Walking',
            notes: 'Best views in the morning'
          }
        ]
      };

      mockBedrockService.generateItinerary.mockResolvedValue(mockBedrockItinerary);
      mockMapsService.createOptimizedItinerary.mockRejectedValue(new Error('Google Maps API error'));

      const result = await service.generateOptimizedItinerary(
        'test-session',
        mockSpots,
        'Tokyo'
      );

      expect(result.title).toContain('Walking (Basic)');
      expect(result.totalTravelTime).toBe('Estimated');
    });
  });

  describe('generateEnhancedItinerary', () => {
    it('should return success result for valid generation', async () => {
      // Mock successful generation
      const mockItinerary = {
        title: 'Smart Tokyo Itinerary',
        totalDuration: '6 hours',
        totalTravelTime: '30 mins',
        schedule: [],
        route: {
          orderedSpots: [],
          totalTravelTime: 0,
          totalDistance: 0,
          routeSteps: []
        }
      };

      mockBedrockService.generateItinerary.mockResolvedValue({
        title: 'Tokyo Itinerary',
        totalDuration: '6 hours',
        schedule: []
      });
      mockMapsService.createOptimizedItinerary.mockResolvedValue(mockItinerary);

      const result = await service.generateEnhancedItinerary(
        'test-session',
        mockSpots,
        'Tokyo'
      );

      expect(result.success).toBe(true);
      expect(result.itinerary).toBeDefined();
      expect(result.fallbackUsed).toBe(false);
    });

    it('should return success with fallback when services fail', async () => {
      // Mock complete failure of both services
      mockBedrockService.generateItinerary.mockRejectedValue(new Error('Complete failure'));
      mockMapsService.createOptimizedItinerary.mockRejectedValue(new Error('Maps failure'));

      const result = await service.generateEnhancedItinerary(
        'test-session',
        mockSpots,
        'Tokyo'
      );

      // The service should still succeed by creating a basic itinerary
      expect(result.success).toBe(true);
      expect(result.itinerary).toBeDefined();
      expect(result.itinerary?.title).toContain('Basic');
      expect(result.fallbackUsed).toBe(true);
    });
  });

  // Test integration between Bedrock Agent and Google Maps
  describe('Bedrock Agent and Google Maps Integration', () => {
    it('should successfully integrate Bedrock insights with Google Maps routing', async () => {
      const mockBedrockItinerary = {
        title: 'Tokyo Cultural Tour',
        totalDuration: '8 hours',
        schedule: [
          {
            time: '09:00',
            spot: 'Tokyo Tower',
            duration: '90 mins',
            transportation: 'Walking',
            notes: 'Best views in the morning, avoid crowds'
          },
          {
            time: '11:00',
            spot: 'Senso-ji Temple',
            duration: '60 mins',
            transportation: 'Subway',
            notes: 'Historic temple, try traditional snacks nearby'
          }
        ]
      };

      const mockOptimizedItinerary = {
        title: 'Optimized Tokyo Itinerary',
        totalDuration: '6 hours',
        totalTravelTime: '45 mins',
        schedule: [
          {
            time: '09:00',
            spot: 'Tokyo Tower',
            duration: '60 mins',
            arrivalTime: '09:00',
            departureTime: '10:00',
            navigationUrl: 'https://maps.google.com/...'
          },
          {
            time: '10:30',
            spot: 'Senso-ji Temple',
            duration: '60 mins',
            arrivalTime: '10:30',
            departureTime: '11:30',
            navigationUrl: 'https://maps.google.com/...'
          }
        ],
        route: {
          orderedSpots: ['Tokyo Tower', 'Senso-ji Temple'],
          totalTravelTime: 1800,
          totalDistance: 5000,
          routeSteps: []
        }
      };

      mockBedrockService.generateItinerary.mockResolvedValue(mockBedrockItinerary);
      mockMapsService.createOptimizedItinerary.mockResolvedValue(mockOptimizedItinerary);

      const result = await service.generateOptimizedItinerary(
        'test-session',
        mockSpots,
        'Tokyo',
        { travelMode: 'walking', includeBreaks: false }
      );

      // Verify integration
      expect(mockBedrockService.generateItinerary).toHaveBeenCalledWith(mockSpots, 'test-session');
      expect(mockMapsService.createOptimizedItinerary).toHaveBeenCalledWith(
        ['Tokyo Tower', 'Senso-ji Temple'],
        'Tokyo',
        'walking',
        '09:00'
      );

      // Verify enhanced schedule combines both services
      expect(result.title).toContain('Smart Tokyo Itinerary');
      expect(result.schedule).toBeDefined();
      expect(result.route).toBeDefined();
    });

    it('should handle different travel modes in integration', async () => {
      const mockBedrockItinerary = {
        title: 'Tokyo Itinerary',
        totalDuration: '6 hours',
        schedule: [
          {
            time: '09:00',
            spot: 'Tokyo Tower',
            duration: '2 hours',
            transportation: 'Driving',
            notes: 'Parking available nearby'
          }
        ]
      };

      const mockOptimizedItinerary = {
        title: 'Optimized Tokyo Itinerary',
        totalDuration: '4 hours',
        totalTravelTime: '20 mins',
        schedule: [
          {
            time: '09:00',
            spot: 'Tokyo Tower',
            duration: '60 mins',
            arrivalTime: '09:00',
            departureTime: '10:00'
          }
        ],
        route: {
          orderedSpots: ['Tokyo Tower'],
          totalTravelTime: 1200,
          totalDistance: 3000,
          routeSteps: []
        }
      };

      mockBedrockService.generateItinerary.mockResolvedValue(mockBedrockItinerary);
      mockMapsService.createOptimizedItinerary.mockResolvedValue(mockOptimizedItinerary);

      // Test driving mode
      const drivingResult = await service.generateOptimizedItinerary(
        'test-session',
        mockSpots,
        'Tokyo',
        { travelMode: 'driving' }
      );

      expect(mockMapsService.createOptimizedItinerary).toHaveBeenCalledWith(
        ['Tokyo Tower', 'Senso-ji Temple'],
        'Tokyo',
        'driving',
        '09:00'
      );
      expect(drivingResult.title).toContain('Driving route');

      // Test transit mode
      await service.generateOptimizedItinerary(
        'test-session',
        mockSpots,
        'Tokyo',
        { travelMode: 'transit' }
      );

      expect(mockMapsService.createOptimizedItinerary).toHaveBeenCalledWith(
        ['Tokyo Tower', 'Senso-ji Temple'],
        'Tokyo',
        'transit',
        '09:00'
      );
    });

    it('should preserve Bedrock insights when Google Maps optimization succeeds', async () => {
      const mockBedrockItinerary = {
        title: 'Tokyo Cultural Experience',
        totalDuration: '7 hours',
        schedule: [
          {
            time: '09:00',
            spot: 'Tokyo Tower',
            duration: '90 mins',
            transportation: 'Walking',
            notes: 'Visit observation deck for panoramic views'
          },
          {
            time: '11:00',
            spot: 'Senso-ji Temple',
            duration: '75 mins',
            transportation: 'Subway',
            notes: 'Ancient Buddhist temple with traditional market'
          }
        ]
      };

      const mockOptimizedItinerary = {
        title: 'Optimized Tokyo Itinerary',
        totalDuration: '6 hours',
        totalTravelTime: '30 mins',
        schedule: [
          {
            time: '09:00',
            spot: 'Tokyo Tower',
            duration: '60 mins',
            arrivalTime: '09:00',
            departureTime: '10:00',
            notes: 'Navigation: 5 min walk from station'
          },
          {
            time: '10:30',
            spot: 'Senso-ji Temple',
            duration: '60 mins',
            arrivalTime: '10:30',
            departureTime: '11:30',
            notes: 'Navigation: Take Ginza Line'
          }
        ],
        route: {
          orderedSpots: ['Tokyo Tower', 'Senso-ji Temple'],
          totalTravelTime: 1800,
          totalDistance: 4500,
          routeSteps: []
        }
      };

      mockBedrockService.generateItinerary.mockResolvedValue(mockBedrockItinerary);
      mockMapsService.createOptimizedItinerary.mockResolvedValue(mockOptimizedItinerary);

      const result = await service.generateOptimizedItinerary(
        'test-session',
        mockSpots,
        'Tokyo',
        { includeBreaks: false }
      );

      // Check that Bedrock insights are preserved and combined with Google Maps data
      const tokyoTowerItem = result.schedule.find(item => item.spot === 'Tokyo Tower');
      const sensojiItem = result.schedule.find(item => item.spot === 'Senso-ji Temple');

      expect(tokyoTowerItem?.notes).toContain('💡 Visit observation deck for panoramic views');
      expect(sensojiItem?.notes).toContain('💡 Ancient Buddhist temple with traditional market');
    });
  });

  // Test fallback behavior when optimization fails
  describe('Fallback Behavior Tests', () => {
    it('should fallback to Bedrock-only itinerary when Google Maps fails', async () => {
      const mockBedrockItinerary = {
        title: 'Tokyo Adventure',
        totalDuration: '8 hours',
        schedule: [
          {
            time: '09:00',
            spot: 'Tokyo Tower',
            duration: '2 hours',
            transportation: 'Walking',
            notes: 'Iconic landmark with great city views'
          },
          {
            time: '12:00',
            spot: 'Senso-ji Temple',
            duration: '1.5 hours',
            transportation: 'Subway',
            notes: 'Historic temple in Asakusa district'
          }
        ]
      };

      mockBedrockService.generateItinerary.mockResolvedValue(mockBedrockItinerary);
      mockMapsService.createOptimizedItinerary.mockRejectedValue(
        new GoogleMapsApiError('API quota exceeded', 'OVER_DAILY_LIMIT', 429)
      );

      const result = await service.generateOptimizedItinerary(
        'test-session',
        mockSpots,
        'Tokyo'
      );

      // Should fallback to basic itinerary
      expect(result.title).toContain('(Basic)');
      expect(result.totalTravelTime).toBe('Estimated');
      expect(result.schedule).toHaveLength(2);
      expect(result.schedule[0].spot).toBe('Tokyo Tower');
      expect(result.schedule[1].spot).toBe('Senso-ji Temple');
    });

    it('should handle Google Maps API quota exceeded error gracefully', async () => {
      const quotaError = new GoogleMapsApiError(
        'Google Maps API daily quota exceeded',
        'OVER_DAILY_LIMIT',
        429
      );
      quotaError.quotaExceeded = true;

      mockBedrockService.generateItinerary.mockResolvedValue({
        title: 'Tokyo Itinerary',
        totalDuration: '6 hours',
        schedule: [
          {
            time: '09:00',
            spot: 'Tokyo Tower',
            duration: '2 hours',
            transportation: 'Walking',
            notes: 'Great views'
          }
        ]
      });
      mockMapsService.createOptimizedItinerary.mockRejectedValue(quotaError);

      const result = await service.generateOptimizedItinerary(
        'test-session',
        mockSpots,
        'Tokyo'
      );

      expect(result.title).toContain('(Basic)');
      expect(result.totalTravelTime).toBe('Estimated');
    });

    it('should handle Google Maps API rate limiting gracefully', async () => {
      const rateLimitError = new GoogleMapsApiError(
        'Rate limit exceeded',
        'OVER_QUERY_LIMIT',
        429
      );
      rateLimitError.rateLimited = true;

      mockBedrockService.generateItinerary.mockResolvedValue({
        title: 'Tokyo Itinerary',
        totalDuration: '6 hours',
        schedule: [
          {
            time: '09:00',
            spot: 'Tokyo Tower',
            duration: '2 hours',
            transportation: 'Walking',
            notes: 'Great views'
          }
        ]
      });
      mockMapsService.createOptimizedItinerary.mockRejectedValue(rateLimitError);

      const result = await service.generateOptimizedItinerary(
        'test-session',
        mockSpots,
        'Tokyo'
      );

      expect(result.title).toContain('(Basic)');
      expect(result.totalTravelTime).toBe('Estimated');
    });

    it('should create basic itinerary when both services fail', async () => {
      mockBedrockService.generateItinerary.mockRejectedValue(new Error('Bedrock service unavailable'));
      mockMapsService.createOptimizedItinerary.mockRejectedValue(new Error('Google Maps unavailable'));

      const result = await service.generateOptimizedItinerary(
        'test-session',
        mockSpots,
        'Tokyo'
      );

      // Should create a basic itinerary as last resort
      expect(result.title).toContain('Basic Itinerary');
      expect(result.schedule).toHaveLength(2);
      expect(result.schedule[0].spot).toBe('Tokyo Tower');
      expect(result.schedule[1].spot).toBe('Senso-ji Temple');
      expect(result.route.orderedSpots).toEqual(['Tokyo Tower', 'Senso-ji Temple']);
    });

    it('should handle invalid session ID in fallback', async () => {
      mockBedrockService.generateItinerary.mockRejectedValue(new Error('Invalid session'));
      mockMapsService.createOptimizedItinerary.mockRejectedValue(new Error('Maps error'));

      const result = await service.generateEnhancedItinerary(
        '', // Invalid session ID
        mockSpots,
        'Tokyo'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid session ID');
      expect(result.fallbackUsed).toBe(true);
    });

    it('should handle empty spots array in fallback', async () => {
      const result = await service.generateEnhancedItinerary(
        'test-session',
        [], // Empty spots array
        'Tokyo'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid spots provided');
      expect(result.fallbackUsed).toBe(true);
    });
  });

  // Test meal break insertion logic
  describe('Meal Break Insertion Logic', () => {
    it('should insert lunch break when schedule crosses 12:00 PM', async () => {
      const mockBedrockItinerary = {
        title: 'Tokyo Day Tour',
        totalDuration: '8 hours',
        schedule: [
          {
            time: '10:00',
            spot: 'Tokyo Tower',
            duration: '90 mins',
            transportation: 'Walking',
            notes: 'Morning visit'
          },
          {
            time: '13:00',
            spot: 'Senso-ji Temple',
            duration: '90 mins',
            transportation: 'Subway',
            notes: 'Afternoon visit'
          }
        ]
      };

      const mockOptimizedItinerary = {
        title: 'Optimized Tokyo Itinerary',
        totalDuration: '8 hours',
        totalTravelTime: '45 mins',
        schedule: [
          {
            time: '10:00',
            spot: 'Tokyo Tower',
            duration: '60 mins',
            arrivalTime: '10:00',
            departureTime: '11:00'
          },
          {
            time: '13:00',
            spot: 'Senso-ji Temple',
            duration: '60 mins',
            arrivalTime: '13:00',
            departureTime: '14:00'
          }
        ],
        route: {
          orderedSpots: ['Tokyo Tower', 'Senso-ji Temple'],
          totalTravelTime: 2700,
          totalDistance: 6000,
          routeSteps: []
        }
      };

      mockBedrockService.generateItinerary.mockResolvedValue(mockBedrockItinerary);
      mockMapsService.createOptimizedItinerary.mockResolvedValue(mockOptimizedItinerary);

      const result = await service.generateOptimizedItinerary(
        'test-session',
        mockSpots,
        'Tokyo',
        { includeBreaks: true }
      );

      // Should have lunch break inserted
      const lunchBreak = result.schedule.find(item => item.spot.includes('Lunch Break'));
      expect(lunchBreak).toBeDefined();
      expect(lunchBreak?.arrivalTime).toBe('12:00');
      expect(lunchBreak?.duration).toBe('60 mins');
      expect(lunchBreak?.notes).toContain('lunch break');
    });

    it('should insert dinner break when schedule crosses 6:00 PM', async () => {
      const mockBedrockItinerary = {
        title: 'Tokyo Evening Tour',
        totalDuration: '10 hours',
        schedule: [
          {
            time: '16:00',
            spot: 'Tokyo Tower',
            duration: '90 mins',
            transportation: 'Walking',
            notes: 'Late afternoon visit'
          },
          {
            time: '19:00',
            spot: 'Senso-ji Temple',
            duration: '90 mins',
            transportation: 'Subway',
            notes: 'Evening visit'
          }
        ]
      };

      const mockOptimizedItinerary = {
        title: 'Optimized Tokyo Itinerary',
        totalDuration: '10 hours',
        totalTravelTime: '45 mins',
        schedule: [
          {
            time: '16:00',
            spot: 'Tokyo Tower',
            duration: '60 mins',
            arrivalTime: '16:00',
            departureTime: '17:00'
          },
          {
            time: '19:00',
            spot: 'Senso-ji Temple',
            duration: '60 mins',
            arrivalTime: '19:00',
            departureTime: '20:00'
          }
        ],
        route: {
          orderedSpots: ['Tokyo Tower', 'Senso-ji Temple'],
          totalTravelTime: 2700,
          totalDistance: 6000,
          routeSteps: []
        }
      };

      mockBedrockService.generateItinerary.mockResolvedValue(mockBedrockItinerary);
      mockMapsService.createOptimizedItinerary.mockResolvedValue(mockOptimizedItinerary);

      const result = await service.generateOptimizedItinerary(
        'test-session',
        mockSpots,
        'Tokyo',
        { includeBreaks: true }
      );

      // Should have dinner break inserted
      const dinnerBreak = result.schedule.find(item => item.spot.includes('Dinner Break'));
      expect(dinnerBreak).toBeDefined();
      expect(dinnerBreak?.arrivalTime).toBe('18:00');
      expect(dinnerBreak?.duration).toBe('90 mins');
      expect(dinnerBreak?.notes).toContain('dinner break');
    });

    it('should not insert duplicate meal breaks', async () => {
      const mockBedrockItinerary = {
        title: 'Tokyo Full Day',
        totalDuration: '12 hours',
        schedule: [
          {
            time: '09:00',
            spot: 'Tokyo Tower',
            duration: '90 mins',
            transportation: 'Walking',
            notes: 'Morning visit'
          },
          {
            time: '12:30',
            spot: 'Senso-ji Temple',
            duration: '90 mins',
            transportation: 'Subway',
            notes: 'Lunch time visit'
          },
          {
            time: '18:30',
            spot: 'Shibuya Crossing',
            duration: '60 mins',
            transportation: 'Train',
            notes: 'Evening visit'
          }
        ]
      };

      const mockOptimizedItinerary = {
        title: 'Optimized Tokyo Itinerary',
        totalDuration: '12 hours',
        totalTravelTime: '90 mins',
        schedule: [
          {
            time: '09:00',
            spot: 'Tokyo Tower',
            duration: '60 mins',
            arrivalTime: '09:00',
            departureTime: '10:00'
          },
          {
            time: '12:30',
            spot: 'Senso-ji Temple',
            duration: '60 mins',
            arrivalTime: '12:30',
            departureTime: '13:30'
          },
          {
            time: '18:30',
            spot: 'Shibuya Crossing',
            duration: '60 mins',
            arrivalTime: '18:30',
            departureTime: '19:30'
          }
        ],
        route: {
          orderedSpots: ['Tokyo Tower', 'Senso-ji Temple', 'Shibuya Crossing'],
          totalTravelTime: 5400,
          totalDistance: 12000,
          routeSteps: []
        }
      };

      mockBedrockService.generateItinerary.mockResolvedValue(mockBedrockItinerary);
      mockMapsService.createOptimizedItinerary.mockResolvedValue(mockOptimizedItinerary);

      const result = await service.generateOptimizedItinerary(
        'test-session',
        [mockSpots[0], mockSpots[1], { ...mockSpots[0], id: 'spot-3', name: 'Shibuya Crossing' }],
        'Tokyo',
        { includeBreaks: true }
      );

      // Should have both lunch and dinner breaks, but not duplicates
      const lunchBreaks = result.schedule.filter(item => item.spot.includes('Lunch Break'));
      const dinnerBreaks = result.schedule.filter(item => item.spot.includes('Dinner Break'));
      
      expect(lunchBreaks).toHaveLength(1);
      expect(dinnerBreaks).toHaveLength(1);
    });

    it('should not insert meal breaks when includeBreaks is false', async () => {
      const mockBedrockItinerary = {
        title: 'Tokyo Quick Tour',
        totalDuration: '8 hours',
        schedule: [
          {
            time: '10:00',
            spot: 'Tokyo Tower',
            duration: '90 mins',
            transportation: 'Walking',
            notes: 'Morning visit'
          },
          {
            time: '14:00',
            spot: 'Senso-ji Temple',
            duration: '90 mins',
            transportation: 'Subway',
            notes: 'Afternoon visit'
          }
        ]
      };

      const mockOptimizedItinerary = {
        title: 'Optimized Tokyo Itinerary',
        totalDuration: '8 hours',
        totalTravelTime: '45 mins',
        schedule: [
          {
            time: '10:00',
            spot: 'Tokyo Tower',
            duration: '60 mins',
            arrivalTime: '10:00',
            departureTime: '11:00'
          },
          {
            time: '14:00',
            spot: 'Senso-ji Temple',
            duration: '60 mins',
            arrivalTime: '14:00',
            departureTime: '15:00'
          }
        ],
        route: {
          orderedSpots: ['Tokyo Tower', 'Senso-ji Temple'],
          totalTravelTime: 2700,
          totalDistance: 6000,
          routeSteps: []
        }
      };

      mockBedrockService.generateItinerary.mockResolvedValue(mockBedrockItinerary);
      mockMapsService.createOptimizedItinerary.mockResolvedValue(mockOptimizedItinerary);

      const result = await service.generateOptimizedItinerary(
        'test-session',
        mockSpots,
        'Tokyo',
        { includeBreaks: false }
      );

      // Should not have any meal breaks
      const mealBreaks = result.schedule.filter(item => 
        item.spot.includes('Lunch Break') || item.spot.includes('Dinner Break')
      );
      expect(mealBreaks).toHaveLength(0);
    });

    it('should handle meal break insertion with custom visit duration', async () => {
      const mockBedrockItinerary = {
        title: 'Tokyo Custom Tour',
        totalDuration: '6 hours',
        schedule: [
          {
            time: '11:00',
            spot: 'Tokyo Tower',
            duration: '45 mins',
            transportation: 'Walking',
            notes: 'Quick visit'
          },
          {
            time: '13:00',
            spot: 'Senso-ji Temple',
            duration: '45 mins',
            transportation: 'Subway',
            notes: 'Quick visit'
          }
        ]
      };

      const mockOptimizedItinerary = {
        title: 'Optimized Tokyo Itinerary',
        totalDuration: '6 hours',
        totalTravelTime: '30 mins',
        schedule: [
          {
            time: '11:00',
            spot: 'Tokyo Tower',
            duration: '45 mins',
            arrivalTime: '11:00',
            departureTime: '11:45'
          },
          {
            time: '13:00',
            spot: 'Senso-ji Temple',
            duration: '45 mins',
            arrivalTime: '13:00',
            departureTime: '13:45'
          }
        ],
        route: {
          orderedSpots: ['Tokyo Tower', 'Senso-ji Temple'],
          totalTravelTime: 1800,
          totalDistance: 4000,
          routeSteps: []
        }
      };

      mockBedrockService.generateItinerary.mockResolvedValue(mockBedrockItinerary);
      mockMapsService.createOptimizedItinerary.mockResolvedValue(mockOptimizedItinerary);

      const result = await service.generateOptimizedItinerary(
        'test-session',
        mockSpots,
        'Tokyo',
        { 
          includeBreaks: true,
          visitDuration: 45 // Custom 45-minute visits
        }
      );

      // Should apply custom visit duration and still insert lunch break
      expect(result.schedule[0].duration).toBe('45 mins');
      expect(result.schedule[1].duration).toBe('45 mins');
      
      const lunchBreak = result.schedule.find(item => item.spot.includes('Lunch Break'));
      expect(lunchBreak).toBeDefined();
    });
  });
});