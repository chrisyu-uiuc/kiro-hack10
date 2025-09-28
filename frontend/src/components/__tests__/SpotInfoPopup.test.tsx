
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SpotInfoPopup from '../SpotInfoPopup';
import { Spot } from '@/types';

// Mock spot data for testing
const mockSpot: Spot = {
  id: '1',
  name: 'Test Museum',
  category: 'Museum',
  location: 'Test City',
  description: 'A wonderful test museum with great exhibits',
  duration: '2 hours'
};

const mockSpotWithGoogleData: Spot = {
  ...mockSpot,
  googlePlaceDetails: {
    placeId: 'ChIJ123',
    name: 'Test Museum',
    formattedAddress: '123 Test St, Test City',
    rating: 4.5,
    userRatingsTotal: 100,
    photos: [],
    reviews: [],
    openingHours: {
      openNow: true,
      periods: [],
      weekdayText: []
    },
    googleMapsUri: 'https://maps.google.com/?cid=123'
  }
};

describe('SpotInfoPopup', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  afterEach(() => {
    // Clean up any side effects
    document.body.style.overflow = 'unset';
  });

  it('should not render when isOpen is false', () => {
    render(
      <SpotInfoPopup 
        spot={mockSpot} 
        isOpen={false} 
        onClose={mockOnClose} 
      />
    );
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <SpotInfoPopup 
        spot={mockSpot} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Museum')).toBeInTheDocument();
  });

  it('should display loading state initially', async () => {
    render(
      <SpotInfoPopup 
        spot={mockSpot} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    expect(screen.getByText('Loading spot details...')).toBeInTheDocument();
  });

  it('should display error message after loading timeout', async () => {
    render(
      <SpotInfoPopup 
        spot={mockSpot} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    // Wait for the timeout to complete
    await waitFor(() => {
      expect(screen.getByText('Unable to load details')).toBeInTheDocument();
    }, { timeout: 2000 });
    
    expect(screen.getByText('Spot details will be available once API integration is complete')).toBeInTheDocument();
  });

  it('should display cached Google Places data when available', () => {
    render(
      <SpotInfoPopup 
        spot={mockSpotWithGoogleData} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    // Should not show loading since we have cached data
    expect(screen.queryByText('Loading spot details...')).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <SpotInfoPopup 
        spot={mockSpot} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    const closeButton = screen.getByLabelText('Close popup');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when overlay is clicked', () => {
    render(
      <SpotInfoPopup 
        spot={mockSpot} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    const overlay = screen.getByRole('dialog');
    fireEvent.click(overlay);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when popup content is clicked', () => {
    render(
      <SpotInfoPopup 
        spot={mockSpot} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    const popupContent = screen.getByText('Test Museum').closest('div');
    if (popupContent) {
      fireEvent.click(popupContent);
    }
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should call onClose when Escape key is pressed', () => {
    render(
      <SpotInfoPopup 
        spot={mockSpot} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when other keys are pressed', () => {
    render(
      <SpotInfoPopup 
        spot={mockSpot} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'Space' });
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should prevent body scroll when popup is open', () => {
    const { rerender } = render(
      <SpotInfoPopup 
        spot={mockSpot} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    expect(document.body.style.overflow).toBe('hidden');
    
    // Close the popup
    rerender(
      <SpotInfoPopup 
        spot={mockSpot} 
        isOpen={false} 
        onClose={mockOnClose} 
      />
    );
    
    expect(document.body.style.overflow).toBe('unset');
  });

  it('should display basic spot information with cached data', () => {
    render(
      <SpotInfoPopup 
        spot={mockSpotWithGoogleData} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    expect(screen.getByText('Test Museum')).toBeInTheDocument();
    // The basic info is shown when we have cached Google Places data
    // but the detailed view will be implemented in later tasks
  });

  it('should have proper accessibility attributes', () => {
    render(
      <SpotInfoPopup 
        spot={mockSpot} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'popup-title');
    
    const title = screen.getByText('Test Museum');
    expect(title).toHaveAttribute('id', 'popup-title');
    
    const closeButton = screen.getByLabelText('Close popup');
    expect(closeButton).toHaveAttribute('type', 'button');
  });

  it('should reset state when popup closes', async () => {
    const { rerender } = render(
      <SpotInfoPopup 
        spot={mockSpot} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    // Wait for loading to appear
    expect(screen.getByText('Loading spot details...')).toBeInTheDocument();
    
    // Close the popup
    rerender(
      <SpotInfoPopup 
        spot={mockSpot} 
        isOpen={false} 
        onClose={mockOnClose} 
      />
    );
    
    // Reopen the popup
    rerender(
      <SpotInfoPopup 
        spot={mockSpot} 
        isOpen={true} 
        onClose={mockOnClose} 
      />
    );
    
    // Should show loading again (state was reset)
    expect(screen.getByText('Loading spot details...')).toBeInTheDocument();
  });
});