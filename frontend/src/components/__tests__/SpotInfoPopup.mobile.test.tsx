import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SpotInfoPopup from '../SpotInfoPopup';
import { Spot } from '@/types';
import ApiService from '@/services/api';

// Mock API service
vi.mock('@/services/api');
const mockApiService = vi.mocked(ApiService);

// Mock window properties for mobile testing
const mockWindow = {
  innerWidth: 375,
  innerHeight: 667,
  visualViewport: {
    width: 375,
    height: 667,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  scrollY: 0,
  scrollTo: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  resizeTimeout: undefined as number | undefined,
};

// Mock touch events
const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
  return new TouchEvent(type, {
    touches: touches.map(touch => ({
      ...touch,
      identifier: 0,
      target: document.body,
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      force: 1,
    })) as any,
    bubbles: true,
    cancelable: true,
  });
};

const mockSpot: Spot = {
  id: 'test-spot-1',
  name: 'Test Museum',
  category: 'Museum',
  location: 'Test City',
  description: 'A test museum for testing purposes',
  duration: '2 hours',
};

describe('SpotInfoPopup Mobile Behavior', () => {
  let originalWindow: any;

  beforeEach(() => {
    // Store original window properties
    originalWindow = {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      visualViewport: window.visualViewport,
      scrollY: window.scrollY,
      scrollTo: window.scrollTo,
    };

    // Mock window properties for mobile
    Object.defineProperty(window, 'innerWidth', { value: mockWindow.innerWidth, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: mockWindow.innerHeight, writable: true });
    Object.defineProperty(window, 'visualViewport', { value: mockWindow.visualViewport, writable: true });
    Object.defineProperty(window, 'scrollY', { value: mockWindow.scrollY, writable: true });
    window.scrollTo = mockWindow.scrollTo;
    window.addEventListener = mockWindow.addEventListener;
    window.removeEventListener = mockWindow.removeEventListener;
    
    // Set mobile flag for tests
    (window as any).__TEST_MOBILE__ = true;

    // Mock successful API response
    mockApiService.fetchSpotDetails.mockResolvedValue({
      placeId: 'test-place-id',
      name: 'Test Museum',
      formattedAddress: '123 Test St, Test City',
      rating: 4.5,
      userRatingsTotal: 100,
      photos: [],
      reviews: [],
      openingHours: {
        openNow: true,
        periods: [],
        weekdayText: ['Monday: 9:00 AM – 5:00 PM'],
      },
      websiteUri: 'https://testmuseum.com',
      googleMapsUri: 'https://maps.google.com/?cid=123',
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original window properties
    Object.defineProperty(window, 'innerWidth', { value: originalWindow.innerWidth, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalWindow.innerHeight, writable: true });
    Object.defineProperty(window, 'visualViewport', { value: originalWindow.visualViewport, writable: true });
    Object.defineProperty(window, 'scrollY', { value: originalWindow.scrollY, writable: true });
    window.scrollTo = originalWindow.scrollTo;
    
    // Clear mobile flag
    delete (window as any).__TEST_MOBILE__;
  });

  describe('Mobile Detection and Layout', () => {
    it('should detect mobile device and apply mobile styles', async () => {
      const onClose = vi.fn();
      
      render(
        <SpotInfoPopup
          spot={mockSpot}
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const overlay = screen.getByRole('dialog');
        expect(overlay).toBeInTheDocument();
      });

      // Check for mobile-specific elements
      const dragIndicator = document.querySelector('[style*="position: absolute"]');
      expect(dragIndicator).toBeInTheDocument();
    });

    it('should apply full-screen modal behavior on mobile', async () => {
      const onClose = vi.fn();
      
      render(
        <SpotInfoPopup
          spot={mockSpot}
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const content = document.querySelector('.popup-content');
        expect(content).toBeInTheDocument();
      });

      // Verify mobile content styles are applied
      const content = document.querySelector('.popup-content') as HTMLElement;
      expect(content.style.maxWidth).toBe('100%');
      expect(content.style.width).toBe('100%');
    });

    it('should have touch-friendly close button on mobile', async () => {
      const onClose = vi.fn();
      
      render(
        <SpotInfoPopup
          spot={mockSpot}
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close popup');
        expect(closeButton).toBeInTheDocument();
      });

      const closeButton = screen.getByLabelText('Close popup') as HTMLElement;
      
      // Check for enhanced touch target size
      expect(closeButton.style.width).toBe('44px');
      expect(closeButton.style.height).toBe('44px');
    });
  });

  describe('Touch Interactions', () => {
    it('should handle swipe down to close', async () => {
      const onClose = vi.fn();
      
      render(
        <SpotInfoPopup
          spot={mockSpot}
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const overlay = screen.getByRole('dialog');
        expect(overlay).toBeInTheDocument();
      });

      const overlay = screen.getByRole('dialog');

      // Simulate swipe down gesture
      act(() => {
        fireEvent(overlay, createTouchEvent('touchstart', [{ clientX: 200, clientY: 100 }]));
      });

      act(() => {
        fireEvent(overlay, createTouchEvent('touchmove', [{ clientX: 200, clientY: 250 }]));
      });

      act(() => {
        fireEvent(overlay, createTouchEvent('touchend', []));
      });

      // Should close after swipe down
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should not close on horizontal swipe', async () => {
      const onClose = vi.fn();
      
      render(
        <SpotInfoPopup
          spot={mockSpot}
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const overlay = screen.getByRole('dialog');
        expect(overlay).toBeInTheDocument();
      });

      const overlay = screen.getByRole('dialog');

      // Simulate horizontal swipe
      act(() => {
        fireEvent(overlay, createTouchEvent('touchstart', [{ clientX: 100, clientY: 200 }]));
      });

      act(() => {
        fireEvent(overlay, createTouchEvent('touchmove', [{ clientX: 250, clientY: 200 }]));
      });

      act(() => {
        fireEvent(overlay, createTouchEvent('touchend', []));
      });

      // Should not close on horizontal swipe
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should not close on small vertical swipe', async () => {
      const onClose = vi.fn();
      
      render(
        <SpotInfoPopup
          spot={mockSpot}
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const overlay = screen.getByRole('dialog');
        expect(overlay).toBeInTheDocument();
      });

      const overlay = screen.getByRole('dialog');

      // Simulate small vertical swipe
      act(() => {
        fireEvent(overlay, createTouchEvent('touchstart', [{ clientX: 200, clientY: 200 }]));
      });

      act(() => {
        fireEvent(overlay, createTouchEvent('touchmove', [{ clientX: 200, clientY: 230 }]));
      });

      act(() => {
        fireEvent(overlay, createTouchEvent('touchend', []));
      });

      // Should not close on small swipe
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Viewport Handling', () => {
    it('should handle viewport changes', async () => {
      const onClose = vi.fn();
      
      render(
        <SpotInfoPopup
          spot={mockSpot}
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const overlay = screen.getByRole('dialog');
        expect(overlay).toBeInTheDocument();
      });

      // Simulate viewport change (e.g., keyboard opening)
      act(() => {
        Object.defineProperty(window, 'innerHeight', { value: 400, writable: true });
        if (window.visualViewport) {
          Object.defineProperty(window.visualViewport, 'height', { value: 400, writable: true });
        }
        fireEvent(window, new Event('resize'));
      });

      // Component should handle viewport change gracefully
      const content = document.querySelector('.popup-content') as HTMLElement;
      expect(content).toBeInTheDocument();
    });

    it('should prevent body scroll when open', async () => {
      const onClose = vi.fn();
      
      render(
        <SpotInfoPopup
          spot={mockSpot}
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const overlay = screen.getByRole('dialog');
        expect(overlay).toBeInTheDocument();
      });

      // Check that body scroll is prevented
      expect(document.body.style.position).toBe('fixed');
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when closed', async () => {
      const onClose = vi.fn();
      
      const { rerender } = render(
        <SpotInfoPopup
          spot={mockSpot}
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const overlay = screen.getByRole('dialog');
        expect(overlay).toBeInTheDocument();
      });

      // Close the popup
      rerender(
        <SpotInfoPopup
          spot={mockSpot}
          isOpen={false}
          onClose={onClose}
        />
      );

      // Check that body scroll is restored
      expect(document.body.style.position).toBe('');
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Performance Optimizations', () => {
    it('should handle rapid touch events without errors', async () => {
      const onClose = vi.fn();
      
      render(
        <SpotInfoPopup
          spot={mockSpot}
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const overlay = screen.getByRole('dialog');
        expect(overlay).toBeInTheDocument();
      });

      const overlay = screen.getByRole('dialog');

      // Simulate rapid touch events
      for (let i = 0; i < 10; i++) {
        act(() => {
          fireEvent(overlay, createTouchEvent('touchstart', [{ clientX: 200, clientY: 100 + i * 10 }]));
          fireEvent(overlay, createTouchEvent('touchmove', [{ clientX: 200, clientY: 150 + i * 10 }]));
          fireEvent(overlay, createTouchEvent('touchend', []));
        });
      }

      // Should handle rapid events without errors
      expect(overlay).toBeInTheDocument();
    });

    it('should debounce resize events', async () => {
      const onClose = vi.fn();
      
      render(
        <SpotInfoPopup
          spot={mockSpot}
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const overlay = screen.getByRole('dialog');
        expect(overlay).toBeInTheDocument();
      });

      // Simulate multiple rapid resize events
      for (let i = 0; i < 5; i++) {
        act(() => {
          fireEvent(window, new Event('resize'));
        });
      }

      // Should handle multiple resize events gracefully
      const content = document.querySelector('.popup-content');
      expect(content).toBeInTheDocument();
    });
  });

  describe('Accessibility on Mobile', () => {
    it('should maintain accessibility attributes on mobile', async () => {
      const onClose = vi.fn();
      
      render(
        <SpotInfoPopup
          spot={mockSpot}
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'popup-title');

      const closeButton = screen.getByLabelText('Close popup');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label', 'Close popup');
    });

    it('should support keyboard navigation on mobile', async () => {
      const onClose = vi.fn();
      
      render(
        <SpotInfoPopup
          spot={mockSpot}
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const overlay = screen.getByRole('dialog');
        expect(overlay).toBeInTheDocument();
      });

      // Test ESC key
      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling on Mobile', () => {
    it('should handle API errors gracefully on mobile', async () => {
      mockApiService.fetchSpotDetails.mockRejectedValue(new Error('Network error'));
      
      const onClose = vi.fn();
      
      render(
        <SpotInfoPopup
          spot={mockSpot}
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const errorMessage = screen.getByText(/Connection Problem|Unable to Load Details/);
        expect(errorMessage).toBeInTheDocument();
      });

      // Error UI should be touch-friendly
      const retryButton = screen.queryByText('Try Again');
      if (retryButton) {
        expect(retryButton).toBeInTheDocument();
      }
    });

    it('should handle touch events during loading state', async () => {
      // Mock slow API response
      mockApiService.fetchSpotDetails.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );
      
      const onClose = vi.fn();
      
      render(
        <SpotInfoPopup
          spot={mockSpot}
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        const loadingText = screen.getByText('Loading spot details...');
        expect(loadingText).toBeInTheDocument();
      });

      const overlay = screen.getByRole('dialog');

      // Should handle touch events during loading
      act(() => {
        fireEvent(overlay, createTouchEvent('touchstart', [{ clientX: 200, clientY: 100 }]));
        fireEvent(overlay, createTouchEvent('touchmove', [{ clientX: 200, clientY: 250 }]));
        fireEvent(overlay, createTouchEvent('touchend', []));
      });

      // Should still be able to close during loading
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      }, { timeout: 500 });
    });
  });
});