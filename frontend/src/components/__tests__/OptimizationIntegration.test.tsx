import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import OptimizationControls from '../OptimizationControls';
import { ItineraryOptions, OptimizedItinerary, EnhancedItineraryResult } from '../../types';
import React from 'react';

// Mock the API service
vi.mock('../../services/api', () => ({
  ApiService: {
    generateOptimizedItinerary: vi.fn(),
  },
}));

const { ApiService } = await import('../../services/api');
const mockedApiService = vi.mocked(ApiService);

// Mock hooks
vi.mock('../../hooks/useAppState');
vi.mock('../../hooks/useScrollToTop', () => ({
  useScrollToTop: vi.fn(),
  scrollToTop: vi.fn(),
}));

const mockOptimizedItinerary: OptimizedItinerary = {
  title: 'Optimized Paris Adventure',
  totalDuration: '8 hours',
  totalTravelTime: '45 minutes',
  schedule: [
    {
      time: '09:00',
      spot: 'Eiffel Tower',
      duration: '2 hours',
      transportation: 'Walking',
      notes: 'Great views from the top',
      arrivalTime: '09:00',
      departureTime: '11:00',
      travelTime: '15 mins',
      navigationUrl: 'https://maps.google.com/directions?destination=Eiffel+Tower',
    },
  ],
  route: {
    orderedSpots: ['Eiffel Tower'],
    totalTravelTime: 900,
    totalDistance: 1500,
    routeSteps: [],
  },
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Optimization Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockOnOptionsChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    user = userEvent.setup();
    mockOnOptionsChange = vi.fn();
    vi.clearAllMocks();
  });

  describe('OptimizationControls Integration', () => {
    it('calls API service when options change', async () => {
      const mockResult: EnhancedItineraryResult = {
        success: true,
        itinerary: mockOptimizedItinerary,
        fallbackUsed: false,
      };

      mockedApiService.generateOptimizedItinerary.mockResolvedValue(mockResult);

      const defaultOptions: ItineraryOptions = {
        travelMode: 'walking',
        startTime: '09:00',
        visitDuration: 60,
        includeBreaks: true,
      };

      render(
        <OptimizationControls 
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      // Change travel mode
      const drivingButton = screen.getByText('🚗 Driving');
      await user.click(drivingButton);

      // Verify the callback was called with correct options
      expect(mockOnOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          travelMode: 'driving',
        })
      );
    });

    it('handles different travel modes correctly', async () => {
      const defaultOptions: ItineraryOptions = {
        travelMode: 'walking',
        startTime: '09:00',
        visitDuration: 60,
        includeBreaks: true,
      };

      render(
        <OptimizationControls 
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      // Test each travel mode
      const transitButton = screen.getByText('🚌 Transit');
      await user.click(transitButton);

      expect(mockOnOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          travelMode: 'transit',
        })
      );
    });

    it('validates option changes are passed correctly', async () => {
      const defaultOptions: ItineraryOptions = {
        travelMode: 'walking',
        startTime: '09:00',
        visitDuration: 60,
        includeBreaks: true,
      };

      render(
        <OptimizationControls 
          options={defaultOptions}
          onOptionsChange={mockOnOptionsChange}
        />
      );

      // Change visit duration
      const durationSlider = screen.getByLabelText(/Visit Duration/);
      fireEvent.change(durationSlider, { target: { value: '90' } });

      expect(mockOnOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          visitDuration: 90,
        })
      );
    });
  });

  describe('API Integration Tests', () => {
    it('verifies API service is called with correct parameters', async () => {
      const mockResult: EnhancedItineraryResult = {
        success: true,
        itinerary: mockOptimizedItinerary,
        fallbackUsed: false,
      };

      mockedApiService.generateOptimizedItinerary.mockResolvedValue(mockResult);

      // Test direct API call
      const options: ItineraryOptions = {
        travelMode: 'driving',
        startTime: '10:00',
        visitDuration: 90,
        includeBreaks: false,
      };

      const result = await ApiService.generateOptimizedItinerary('test-session', options);

      expect(mockedApiService.generateOptimizedItinerary).toHaveBeenCalledWith('test-session', options);
      expect(result.success).toBe(true);
      expect(result.itinerary).toEqual(mockOptimizedItinerary);
    });

    it('handles API errors correctly', async () => {
      const error = new Error('API quota exceeded');
      mockedApiService.generateOptimizedItinerary.mockRejectedValue(error);

      await expect(
        ApiService.generateOptimizedItinerary('test-session')
      ).rejects.toThrow('API quota exceeded');
    });
  });
});