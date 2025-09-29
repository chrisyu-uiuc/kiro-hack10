import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ItineraryDisplay from '../ItineraryDisplay';
import { OptimizedItinerary, Itinerary } from '../../types';

// Mock the hooks and services
vi.mock('../hooks/useAppState');
vi.mock('../services/api');
vi.mock('../hooks/useScrollToTop', () => ({
  useScrollToTop: vi.fn(),
  scrollToTop: vi.fn(),
}));

const mockState = {
  currentStep: 'itinerary' as const,
  city: 'Paris',
  sessionId: 'test-session',
  spots: [],
  selectedSpotIds: [],
  itinerary: null,
  optimizedItinerary: null,
  loading: false,
  loadingMore: false,
  loadingItinerary: false,
  error: null,
  noMoreSpots: false,
};

const mockActions = {
  state: mockState,
  updateState: vi.fn(),
  setLoading: vi.fn(),
  setLoadingMore: vi.fn(),
  setLoadingItinerary: vi.fn(),
  setError: vi.fn(),
  setCity: vi.fn(),
  setSessionId: vi.fn(),
  setSpots: vi.fn(),
  addMoreSpots: vi.fn(),
  toggleSpotSelection: vi.fn(),
  setItinerary: vi.fn(),
  setOptimizedItinerary: vi.fn(),
  goToStep: vi.fn(),
  resetState: vi.fn(),
  getSelectedSpots: vi.fn(),
  cleanupSelectedSpotIds: vi.fn(),
};

const basicItinerary: Itinerary = {
  title: 'Paris Adventure',
  totalDuration: '8 hours',
  schedule: [
    {
      time: '09:00',
      spot: 'Eiffel Tower',
      duration: '2 hours',
      transportation: 'Walking',
      notes: 'Great views from the top',
    },
    {
      time: '11:30',
      spot: 'Louvre Museum',
      duration: '3 hours',
      transportation: 'Metro',
      notes: 'Don\'t miss the Mona Lisa',
    },
  ],
};

const optimizedItinerary: OptimizedItinerary = {
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
    {
      time: '11:30',
      spot: 'Louvre Museum',
      duration: '3 hours',
      transportation: 'Metro',
      notes: 'Don\'t miss the Mona Lisa',
      arrivalTime: '11:15',
      departureTime: '14:15',
      travelTime: '30 mins',
      navigationUrl: 'https://maps.google.com/directions?destination=Louvre+Museum',
    },
  ],
  route: {
    orderedSpots: ['Eiffel Tower', 'Louvre Museum'],
    totalTravelTime: 2700, // 45 minutes in seconds
    totalDistance: 3500, // 3.5 km in meters
    routeSteps: [
      {
        from: 'Eiffel Tower',
        to: 'Louvre Museum',
        travelTime: {
          duration: 900, // 15 minutes
          distance: 1500, // 1.5 km
          durationText: '15 mins',
          distanceText: '1.5 km',
        },
        mode: 'walking' as const,
        navigationUrl: 'https://maps.google.com/directions?origin=Eiffel+Tower&destination=Louvre+Museum',
      },
    ],
  },
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ItineraryDisplay', () => {
  it('renders basic itinerary correctly', () => {
    const stateWithItinerary = {
      ...mockState,
      itinerary: basicItinerary,
    };

    const propsWithItinerary = {
      ...mockActions,
      state: stateWithItinerary,
    };

    renderWithRouter(<ItineraryDisplay {...propsWithItinerary} />);

    expect(screen.getByText('🗓️ Paris Adventure')).toBeInTheDocument();
    expect(screen.getByText(/Total Duration: 8 hours/)).toBeInTheDocument();
    expect(screen.getByText('Eiffel Tower')).toBeInTheDocument();
    expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
  });

  it('renders optimized itinerary with enhanced features', () => {
    const stateWithOptimizedItinerary = {
      ...mockState,
      optimizedItinerary,
    };

    const propsWithOptimizedItinerary = {
      ...mockActions,
      state: stateWithOptimizedItinerary,
    };

    renderWithRouter(<ItineraryDisplay {...propsWithOptimizedItinerary} />);

    expect(screen.getByText('🗓️ Optimized Paris Adventure')).toBeInTheDocument();
    expect(screen.getByText('🎯 Route Optimization Summary')).toBeInTheDocument();
    expect(screen.getByText('Total Travel Time:')).toBeInTheDocument();
    expect(screen.getByText('45 minutes')).toBeInTheDocument();
    expect(screen.getByText('Total Distance:')).toBeInTheDocument();
    expect(screen.getByText('3.5 km')).toBeInTheDocument();
  });

  it('shows navigation buttons for optimized itinerary', () => {
    const stateWithOptimizedItinerary = {
      ...mockState,
      optimizedItinerary,
    };

    const propsWithOptimizedItinerary = {
      ...mockActions,
      state: stateWithOptimizedItinerary,
    };

    renderWithRouter(<ItineraryDisplay {...propsWithOptimizedItinerary} />);

    const navigationButtons = screen.getAllByText(/🧭 Navigate/);
    expect(navigationButtons.length).toBeGreaterThan(0);
  });

  it('displays arrival and departure times for optimized itinerary', () => {
    const stateWithOptimizedItinerary = {
      ...mockState,
      optimizedItinerary,
    };

    const propsWithOptimizedItinerary = {
      ...mockActions,
      state: stateWithOptimizedItinerary,
    };

    renderWithRouter(<ItineraryDisplay {...propsWithOptimizedItinerary} />);

    expect(screen.getByText(/📍 Arrive: 09:00/)).toBeInTheDocument();
    expect(screen.getByText(/🚀 Depart: 11:00/)).toBeInTheDocument();
    expect(screen.getByText(/📍 Arrive: 11:15/)).toBeInTheDocument();
    expect(screen.getByText(/🚀 Depart: 14:15/)).toBeInTheDocument();
  });

  it('shows route overview with steps', () => {
    const stateWithOptimizedItinerary = {
      ...mockState,
      optimizedItinerary,
    };

    const propsWithOptimizedItinerary = {
      ...mockActions,
      state: stateWithOptimizedItinerary,
    };

    renderWithRouter(<ItineraryDisplay {...propsWithOptimizedItinerary} />);

    expect(screen.getByText('📍 Route Overview')).toBeInTheDocument();
    expect(screen.getAllByText('Eiffel Tower')).toHaveLength(2); // One in route overview, one in schedule
    expect(screen.getAllByText('Louvre Museum')).toHaveLength(2); // One in route overview, one in schedule
    // Check for route-specific elements by class
    const routeTravelTime = document.querySelector('.route-travel-time');
    expect(routeTravelTime).toBeInTheDocument();
    expect(routeTravelTime?.textContent?.trim()).toBe('🚶 15 mins');
    
    const routeDistance = document.querySelector('.route-distance');
    expect(routeDistance).toBeInTheDocument();
    expect(routeDistance?.textContent?.trim()).toBe('📏 1.5 km');
  });

  it('handles no itinerary state', () => {
    renderWithRouter(<ItineraryDisplay {...mockActions} />);

    expect(screen.getByText('No itinerary available')).toBeInTheDocument();
    expect(screen.getByText('Please go back and select some spots first.')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    const loadingState = {
      ...mockState,
      loading: true,
    };

    const loadingProps = {
      ...mockActions,
      state: loadingState,
    };

    renderWithRouter(<ItineraryDisplay {...loadingProps} />);

    expect(screen.getByText('Crafting your perfect itinerary...')).toBeInTheDocument();
  });

  it('handles error state', () => {
    const errorState = {
      ...mockState,
      error: 'Failed to generate itinerary',
    };

    const errorProps = {
      ...mockActions,
      state: errorState,
    };

    renderWithRouter(<ItineraryDisplay {...errorProps} />);

    expect(screen.getByText('❌ Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to generate itinerary')).toBeInTheDocument();
  });

  it('opens navigation URLs in new tab when navigation buttons are clicked', async () => {
    const stateWithOptimizedItinerary = {
      ...mockState,
      optimizedItinerary,
      city: 'Paris',
    };

    const propsWithOptimizedItinerary = {
      ...mockActions,
      state: stateWithOptimizedItinerary,
    };

    // Mock window.open
    const mockWindowOpen = vi.fn();
    Object.defineProperty(window, 'open', {
      value: mockWindowOpen,
      writable: true,
    });

    renderWithRouter(<ItineraryDisplay {...propsWithOptimizedItinerary} />);

    // Click on the first spot's navigation button
    const mapIcons = screen.getAllByTitle(/Get directions to/);
    const firstMapIcon = mapIcons[0];
    fireEvent.click(firstMapIcon);
    
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=Eiffel%20Tower+Paris',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('handles route step navigation correctly', async () => {
    const stateWithOptimizedItinerary = {
      ...mockState,
      optimizedItinerary,
    };

    const propsWithOptimizedItinerary = {
      ...mockActions,
      state: stateWithOptimizedItinerary,
    };

    const mockWindowOpen = vi.fn();
    Object.defineProperty(window, 'open', {
      value: mockWindowOpen,
      writable: true,
    });

    renderWithRouter(<ItineraryDisplay {...propsWithOptimizedItinerary} />);

    // Find route step navigation button
    const routeNavButtons = screen.getAllByText('🧭 Navigate');
    const routeStepButton = routeNavButtons.find(button => 
      button.className.includes('btn-route-navigate')
    );
    
    if (routeStepButton) {
      fireEvent.click(routeStepButton);
      
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://maps.google.com/directions?origin=Eiffel+Tower&destination=Louvre+Museum',
        '_blank',
        'noopener,noreferrer'
      );
    }
  });

  it('displays travel mode icons correctly', () => {
    const stateWithOptimizedItinerary = {
      ...mockState,
      optimizedItinerary,
    };

    const propsWithOptimizedItinerary = {
      ...mockActions,
      state: stateWithOptimizedItinerary,
    };

    renderWithRouter(<ItineraryDisplay {...propsWithOptimizedItinerary} />);

    // Check for walking icon in route steps
    const walkingIcon = document.querySelector('.route-travel-time');
    expect(walkingIcon?.textContent).toContain('🚶');
  });

  it('formats distances correctly for different units', () => {
    const itineraryWithLongDistance: OptimizedItinerary = {
      ...optimizedItinerary,
      route: {
        ...optimizedItinerary.route,
        totalDistance: 5500, // 5.5 km
      }
    };

    const stateWithLongDistance = {
      ...mockState,
      optimizedItinerary: itineraryWithLongDistance,
    };

    const propsWithLongDistance = {
      ...mockActions,
      state: stateWithLongDistance,
    };

    renderWithRouter(<ItineraryDisplay {...propsWithLongDistance} />);

    expect(screen.getByText('5.5 km')).toBeInTheDocument();
  });

  it('handles print functionality', () => {
    const stateWithItinerary = {
      ...mockState,
      itinerary: basicItinerary,
    };

    const propsWithItinerary = {
      ...mockActions,
      state: stateWithItinerary,
    };

    // Mock window.print
    const mockPrint = vi.fn();
    Object.defineProperty(window, 'print', {
      value: mockPrint,
      writable: true,
    });

    renderWithRouter(<ItineraryDisplay {...propsWithItinerary} />);

    const printButton = screen.getByText('🖨️ Print Itinerary');
    fireEvent.click(printButton);

    expect(mockPrint).toHaveBeenCalled();
  });

  it('shows Google Maps navigation for all spots', () => {
    const stateWithOptimizedItinerary = {
      ...mockState,
      optimizedItinerary,
      spots: [
        { id: '1', name: 'Eiffel Tower', category: 'Landmark', location: 'Paris', description: 'Iconic iron tower', duration: '2 hours' },
        { id: '2', name: 'Louvre Museum', category: 'Museum', location: 'Paris', description: 'World famous art museum', duration: '3 hours' }
      ]
    };

    const propsWithOptimizedItinerary = {
      ...mockActions,
      state: stateWithOptimizedItinerary,
    };

    renderWithRouter(<ItineraryDisplay {...propsWithOptimizedItinerary} />);

    // Should show Google Maps icon for each spot
    const mapIcons = screen.getAllByTitle(/Get directions to/);
    expect(mapIcons).toHaveLength(2); // One for each spot
    
    mapIcons.forEach(icon => {
      expect(icon.textContent).toBe('🗺️');
    });
  });

  it('displays original spot descriptions instead of enhanced notes', () => {
    const stateWithOptimizedItinerary = {
      ...mockState,
      optimizedItinerary,
      spots: [
        { id: '1', name: 'Eiffel Tower', category: 'Landmark', location: 'Paris', description: 'Iconic iron tower built in 1889', duration: '2 hours' },
        { id: '2', name: 'Louvre Museum', category: 'Museum', location: 'Paris', description: 'World famous art museum with the Mona Lisa', duration: '3 hours' }
      ]
    };

    const propsWithOptimizedItinerary = {
      ...mockActions,
      state: stateWithOptimizedItinerary,
    };

    renderWithRouter(<ItineraryDisplay {...propsWithOptimizedItinerary} />);

    // Should show original descriptions instead of enhanced notes
    expect(screen.getByText('Iconic iron tower built in 1889')).toBeInTheDocument();
    expect(screen.getByText('World famous art museum with the Mona Lisa')).toBeInTheDocument();
    
    // Should not show the enhanced notes
    expect(screen.queryByText('Great views from the top')).not.toBeInTheDocument();
    expect(screen.queryByText('Don\'t miss the Mona Lisa')).not.toBeInTheDocument();
  });

  it('handles multi-day itineraries when times go past 8pm', () => {
    const lateItinerary: OptimizedItinerary = {
      ...optimizedItinerary,
      schedule: [
        {
          time: '18:00',
          spot: 'Evening Spot',
          duration: '2 hours',
          arrivalTime: '18:00',
          departureTime: '20:00',
        },
        {
          time: '21:00',
          spot: 'Late Night Spot',
          duration: '2 hours',
          arrivalTime: '21:00',
          departureTime: '23:00',
        },
        {
          time: '08:00',
          spot: 'Early Morning Spot',
          duration: '2 hours',
          arrivalTime: '08:00',
          departureTime: '10:00',
        }
      ]
    };

    const stateWithLateItinerary = {
      ...mockState,
      optimizedItinerary: lateItinerary,
    };

    const propsWithLateItinerary = {
      ...mockActions,
      state: stateWithLateItinerary,
    };

    renderWithRouter(<ItineraryDisplay {...propsWithLateItinerary} />);

    // First spot should not have day label (before 8pm)
    expect(screen.getByText(/📍 Arrive: 18:00/)).toBeInTheDocument();
    
    // Second spot should not have day label (same day, after 8pm)
    expect(screen.getByText(/📍 Arrive: 21:00/)).toBeInTheDocument();
    
    // Third spot should have Day 2 label and start at 09:00 (adjusted from 08:00)
    expect(screen.getByText(/Day 2 - 📍 Arrive: 09:00/)).toBeInTheDocument();
  });

  it('handles missing navigation URLs gracefully', () => {
    const itineraryWithoutNavUrls: OptimizedItinerary = {
      ...optimizedItinerary,
      schedule: optimizedItinerary.schedule.map(item => ({
        ...item,
        navigationUrl: undefined,
      })),
    };

    const stateWithoutNavUrls = {
      ...mockState,
      optimizedItinerary: itineraryWithoutNavUrls,
    };

    const propsWithoutNavUrls = {
      ...mockActions,
      state: stateWithoutNavUrls,
    };

    renderWithRouter(<ItineraryDisplay {...propsWithoutNavUrls} />);

    // Should not show navigation buttons when URLs are missing
    const navigationSections = document.querySelectorAll('.navigation-section');
    expect(navigationSections).toHaveLength(0);
  });

  it('displays route optimization summary with correct calculations', () => {
    const stateWithOptimizedItinerary = {
      ...mockState,
      optimizedItinerary,
    };

    const propsWithOptimizedItinerary = {
      ...mockActions,
      state: stateWithOptimizedItinerary,
    };

    renderWithRouter(<ItineraryDisplay {...propsWithOptimizedItinerary} />);

    // Check summary statistics
    expect(screen.getByText('Total Travel Time:')).toBeInTheDocument();
    expect(screen.getByText('45 minutes')).toBeInTheDocument();
    expect(screen.getByText('Total Distance:')).toBeInTheDocument();
    expect(screen.getByText('3.5 km')).toBeInTheDocument();
    expect(screen.getByText('2 stops')).toBeInTheDocument();
  });

  it('handles empty route steps gracefully', () => {
    const itineraryWithEmptySteps: OptimizedItinerary = {
      ...optimizedItinerary,
      route: {
        ...optimizedItinerary.route,
        routeSteps: [],
      }
    };

    const stateWithEmptySteps = {
      ...mockState,
      optimizedItinerary: itineraryWithEmptySteps,
    };

    const propsWithEmptySteps = {
      ...mockActions,
      state: stateWithEmptySteps,
    };

    renderWithRouter(<ItineraryDisplay {...propsWithEmptySteps} />);

    // Should still show optimization summary but no route steps
    expect(screen.getByText('🎯 Route Optimization Summary')).toBeInTheDocument();
    expect(screen.queryByText('📍 Route Overview')).not.toBeInTheDocument();
  });

  it('handles component re-renders without losing state', () => {
    const stateWithOptimizedItinerary = {
      ...mockState,
      optimizedItinerary,
    };

    const propsWithOptimizedItinerary = {
      ...mockActions,
      state: stateWithOptimizedItinerary,
    };

    const { rerender } = renderWithRouter(
      <ItineraryDisplay {...propsWithOptimizedItinerary} />
    );

    expect(screen.getByText('🗓️ Optimized Paris Adventure')).toBeInTheDocument();

    // Re-render with same props
    rerender(
      <BrowserRouter>
        <ItineraryDisplay {...propsWithOptimizedItinerary} />
      </BrowserRouter>
    );

    expect(screen.getByText('🗓️ Optimized Paris Adventure')).toBeInTheDocument();
  });
});