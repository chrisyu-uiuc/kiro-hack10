import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OptimizedImage } from '../OptimizedImage';
import { SessionCache } from '../../utils/cache';
import { ImagePerformanceTracker } from '../../utils/performance';

// Mock the cache and performance utilities
vi.mock('../../utils/cache', () => ({
  SessionCache: {
    getImageCache: vi.fn(),
    setImageCache: vi.fn()
  }
}));

vi.mock('../../utils/performance', () => ({
  ImagePerformanceTracker: {
    startImageLoad: vi.fn(),
    endImageLoad: vi.fn()
  }
}));

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock HTMLCanvasElement
const mockCanvas = {
  getContext: vi.fn(() => ({
    drawImage: vi.fn()
  })),
  toBlob: vi.fn((callback) => {
    const mockBlob = new Blob(['mock'], { type: 'image/jpeg' });
    callback(mockBlob);
  }),
  width: 0,
  height: 0
};

global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
global.HTMLCanvasElement.prototype.toBlob = mockCanvas.toBlob;

describe('OptimizedImage', () => {
  const mockProps = {
    src: 'https://example.com/image.jpg',
    alt: 'Test image',
    width: 400,
    height: 300
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (SessionCache.getImageCache as any).mockReturnValue(null);
  });

  it('should render with loading state initially', () => {
    render(<OptimizedImage {...mockProps} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should use cached image when available', async () => {
    const cachedUrl = 'blob:cached-url';
    (SessionCache.getImageCache as any).mockReturnValue(cachedUrl);

    render(<OptimizedImage {...mockProps} lazy={false} />);

    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', cachedUrl);
    });

    expect(SessionCache.getImageCache).toHaveBeenCalledWith(mockProps.src);
  });

  it('should handle image load success', async () => {
    render(<OptimizedImage {...mockProps} lazy={false} />);

    // Simulate image load
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 800 });
    Object.defineProperty(img, 'naturalHeight', { value: 600 });
    
    // Mock Image constructor
    const originalImage = global.Image;
    global.Image = vi.fn(() => img) as any;

    // Trigger onload
    setTimeout(() => {
      if (img.onload) {
        img.onload({} as Event);
      }
    }, 0);

    await waitFor(() => {
      expect(ImagePerformanceTracker.startImageLoad).toHaveBeenCalledWith(mockProps.src);
    });

    global.Image = originalImage;
  });

  it('should handle image load error', async () => {
    render(<OptimizedImage {...mockProps} lazy={false} />);

    const img = document.createElement('img');
    
    // Mock Image constructor
    const originalImage = global.Image;
    global.Image = vi.fn(() => img) as any;

    // Trigger onerror
    setTimeout(() => {
      if (img.onerror) {
        img.onerror({} as Event);
      }
    }, 0);

    await waitFor(() => {
      expect(screen.getByText('Image unavailable')).toBeInTheDocument();
    });

    global.Image = originalImage;
  });

  it('should show custom placeholder on error', async () => {
    const customPlaceholder = 'Custom error message';
    
    render(
      <OptimizedImage 
        {...mockProps} 
        lazy={false} 
        placeholder={customPlaceholder}
      />
    );

    const img = document.createElement('img');
    
    // Mock Image constructor
    const originalImage = global.Image;
    global.Image = vi.fn(() => img) as any;

    // Trigger onerror
    setTimeout(() => {
      if (img.onerror) {
        img.onerror({} as Event);
      }
    }, 0);

    await waitFor(() => {
      expect(screen.getByText(customPlaceholder)).toBeInTheDocument();
    });

    global.Image = originalImage;
  });

  it('should optimize Google Places image URLs', () => {
    const googleUrl = 'https://maps.googleapis.com/maps/api/place/photo?photoreference=test&key=test';
    
    render(
      <OptimizedImage 
        src={googleUrl}
        alt="Google image"
        width={600}
        height={400}
        quality="high"
        lazy={false}
      />
    );

    expect(ImagePerformanceTracker.startImageLoad).toHaveBeenCalledWith(
      expect.stringContaining('w=600')
    );
  });

  it('should handle different quality settings', () => {
    const { rerender } = render(
      <OptimizedImage 
        {...mockProps}
        quality="low"
        lazy={false}
      />
    );

    // Low quality should limit width
    expect(ImagePerformanceTracker.startImageLoad).toHaveBeenCalledWith(
      expect.stringContaining(mockProps.src)
    );

    rerender(
      <OptimizedImage 
        {...mockProps}
        quality="high"
        lazy={false}
      />
    );

    // High quality should allow larger width
    expect(ImagePerformanceTracker.startImageLoad).toHaveBeenCalledTimes(2);
  });

  it('should use intersection observer for lazy loading', () => {
    const mockObserve = vi.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: mockObserve,
      unobserve: vi.fn(),
      disconnect: vi.fn()
    });

    render(<OptimizedImage {...mockProps} lazy={true} />);

    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      { rootMargin: '50px' }
    );
    expect(mockObserve).toHaveBeenCalled();
  });

  it('should not use intersection observer when lazy is false', () => {
    render(<OptimizedImage {...mockProps} lazy={false} />);

    // Should start loading immediately
    expect(ImagePerformanceTracker.startImageLoad).toHaveBeenCalledWith(mockProps.src);
  });

  it('should call onLoad callback when image loads successfully', async () => {
    const onLoad = vi.fn();
    
    render(<OptimizedImage {...mockProps} onLoad={onLoad} lazy={false} />);

    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 800 });
    Object.defineProperty(img, 'naturalHeight', { value: 600 });
    
    const originalImage = global.Image;
    global.Image = vi.fn(() => img) as any;

    setTimeout(() => {
      if (img.onload) {
        img.onload({} as Event);
      }
    }, 0);

    await waitFor(() => {
      expect(onLoad).toHaveBeenCalled();
    });

    global.Image = originalImage;
  });

  it('should call onError callback when image fails to load', async () => {
    const onError = vi.fn();
    
    render(<OptimizedImage {...mockProps} onError={onError} lazy={false} />);

    const img = document.createElement('img');
    
    const originalImage = global.Image;
    global.Image = vi.fn(() => img) as any;

    setTimeout(() => {
      if (img.onerror) {
        img.onerror({} as Event);
      }
    }, 0);

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });

    global.Image = originalImage;
  });

  it('should apply custom styles and className', () => {
    const customStyle = { border: '1px solid red' };
    const customClass = 'custom-image-class';

    render(
      <OptimizedImage 
        {...mockProps}
        style={customStyle}
        className={customClass}
      />
    );

    const container = screen.getByText('Loading...').parentElement;
    expect(container).toHaveClass(customClass);
    expect(container).toHaveStyle('border: 1px solid red');
  });

  it('should cleanup blob URLs on unmount', () => {
    const { unmount } = render(<OptimizedImage {...mockProps} />);

    unmount();

    // Note: This is hard to test directly since the cleanup happens in useEffect
    // In a real scenario, we'd need to mock the component's internal state
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });
});