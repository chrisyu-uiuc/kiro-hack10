import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SpotSelection from '../SpotSelection';
import { useAppState } from '../../hooks/useAppState';
import { ApiService } from '../../services/api';
import { Spot } from '../../types';

// Mock dependencies
vi.mock('../../hooks/useAppState');
vi.mock('../../services/api');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock SpotInfoPopup component
vi.mock('../SpotInfoPopup', () => ({
  default: ({ spot, isOpen, onClose }: any) => (
    isOpen ? (
      <div data-testid="spot-info-popup">
        <h2>{spot.name}</h2>
        <button onClick={onClose} data-testid="close-popup">Close</button>
      </div>
    ) : null
  )
}));

const mockSpots: Spot[] = [
  {
    id: '1',
    name: 'Test Museum',
    category: 'Museum',
    location: 'Downtown',
    description: 'A great museum to visit',
    duration: '2 hours'
  },
  {
    id: '2',
    name: 'Test Park',
    category: 'Park',
    location: 'City Center',
    description: 'Beautiful park with gardens',
    duration: '1 hour'
  }
];

const mockAppState = {
  currentStep: 'spots' as const,
  city: 'Test City',
  sessionId: 'test-session-123',
  spots: mockSpots,
  selectedSpotIds: [],
  itinerary: null,
  optimizedItinerary: null,
  loading: false,
  loadingMore: false,
  loadingItinerary: false,
  error: null,
  noMoreSpots: false
};

const mockAppStateFunctions = {
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
  getSelectedSpots: vi.fn(() => []),
  goToStep: vi.fn(),
  resetState: vi.fn(),
  cleanupSelectedSpotIds: vi.fn()
};

describe('SpotSelection - Information Button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppState as any).mockReturnValue({
      state: mockAppState,
      ...mockAppStateFunctions
    });
    (ApiService.generateSpots as any) = vi.fn().mockResolvedValue({
      spots: mockSpots,
      sessionId: 'test-session-123'
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <SpotSelection
          state={mockAppState}
          {...mockAppStateFunctions}
        />
      </BrowserRouter>
    );
  };

  it('renders information buttons on each spot card', () => {
    renderComponent();
    
    const infoButtons = screen.getAllByLabelText(/View detailed information about/);
    expect(infoButtons).toHaveLength(mockSpots.length);
    
    // Check that each button has the correct aria-label
    expect(screen.getByLabelText('View detailed information about Test Museum')).toBeInTheDocument();
    expect(screen.getByLabelText('View detailed information about Test Park')).toBeInTheDocument();
  });

  it('displays information button with correct styling and accessibility attributes', () => {
    renderComponent();
    
    const infoButton = screen.getByLabelText('View detailed information about Test Museum');
    
    expect(infoButton).toHaveClass('spot-info-button');
    expect(infoButton).toHaveAttribute('type', 'button');
    expect(infoButton).toHaveAttribute('title', 'View detailed information about Test Museum');
    expect(infoButton).toHaveAttribute('aria-label', 'View detailed information about Test Museum');
  });

  it('opens popup when information button is clicked', async () => {
    renderComponent();
    
    const infoButton = screen.getByLabelText('View detailed information about Test Museum');
    fireEvent.click(infoButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('spot-info-popup')).toBeInTheDocument();
    });
  });

  it('closes popup when close button is clicked', async () => {
    renderComponent();
    
    // Open popup
    const infoButton = screen.getByLabelText('View detailed information about Test Museum');
    fireEvent.click(infoButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('spot-info-popup')).toBeInTheDocument();
    });
    
    // Close popup
    const closeButton = screen.getByTestId('close-popup');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('spot-info-popup')).not.toBeInTheDocument();
    });
  });

  it('does not trigger spot selection when information button is clicked', () => {
    renderComponent();
    
    const infoButton = screen.getByLabelText('View detailed information about Test Museum');
    fireEvent.click(infoButton);
    
    // toggleSpotSelection should not be called
    expect(mockAppStateFunctions.toggleSpotSelection).not.toHaveBeenCalled();
  });

  it('still allows spot selection when clicking on the card (not the info button)', () => {
    renderComponent();
    
    const spotCard = screen.getByText('Test Museum').closest('.spot-card');
    expect(spotCard).toBeInTheDocument();
    
    fireEvent.click(spotCard!);
    
    expect(mockAppStateFunctions.toggleSpotSelection).toHaveBeenCalledWith('1');
  });

  it('handles multiple spot info buttons independently', async () => {
    renderComponent();
    
    // Click first spot's info button
    const firstInfoButton = screen.getByLabelText('View detailed information about Test Museum');
    fireEvent.click(firstInfoButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('spot-info-popup')).toBeInTheDocument();
    });
    
    // Close first popup
    const closeButton = screen.getByTestId('close-popup');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByTestId('spot-info-popup')).not.toBeInTheDocument();
    });
    
    // Click second spot's info button
    const secondInfoButton = screen.getByLabelText('View detailed information about Test Park');
    fireEvent.click(secondInfoButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('spot-info-popup')).toBeInTheDocument();
    });
  });

  it('positions info button correctly when spot is selected', () => {
    const selectedState = {
      ...mockAppState,
      selectedSpotIds: ['1']
    };
    
    render(
      <BrowserRouter>
        <SpotSelection
          state={selectedState}
          {...mockAppStateFunctions}
        />
      </BrowserRouter>
    );
    
    const spotCard = screen.getByText('Test Museum').closest('.spot-card');
    expect(spotCard).toHaveClass('selected');
    
    const infoButton = screen.getByLabelText('View detailed information about Test Museum');
    expect(infoButton).toBeInTheDocument();
  });

  it('maintains accessibility with keyboard navigation', () => {
    renderComponent();
    
    const infoButton = screen.getByLabelText('View detailed information about Test Museum');
    
    // Button should be focusable
    infoButton.focus();
    expect(document.activeElement).toBe(infoButton);
    
    // Should trigger on Enter key
    fireEvent.keyDown(infoButton, { key: 'Enter' });
    // Note: This would need additional setup to test keyboard events properly
  });
});