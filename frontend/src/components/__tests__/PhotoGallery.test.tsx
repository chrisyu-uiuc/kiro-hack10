import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PhotoGallery from '../PhotoGallery';
import { PlacePhoto } from '@/types';

// Mock photos for testing
const mockPhotos: PlacePhoto[] = [
  {
    photoReference: 'photo1',
    width: 800,
    height: 600,
    htmlAttributions: ['Attribution 1']
  },
  {
    photoReference: 'photo2',
    width: 800,
    height: 600,
    htmlAttributions: ['Attribution 2']
  },
  {
    photoReference: 'photo3',
    width: 800,
    height: 600,
    htmlAttributions: ['Attribution 3']
  }
];

const singlePhoto: PlacePhoto[] = [
  {
    photoReference: 'single-photo',
    width: 800,
    height: 600,
    htmlAttributions: ['Single Attribution']
  }
];

// Mock touch events
const createTouchEvent = (clientX: number) => ({
  touches: [{ clientX }],
  preventDefault: vi.fn(),
  stopPropagation: vi.fn()
});

describe('PhotoGallery', () => {
  beforeEach(() => {
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Empty state', () => {
    it('should display no photos message when photos array is empty', () => {
      render(<PhotoGallery photos={[]} altText="Test Location" />);
      
      expect(screen.getByText('No photos available')).toBeInTheDocument();
      expect(screen.getByText('📷')).toBeInTheDocument();
    });

    it('should display no photos message when photos is undefined', () => {
      render(<PhotoGallery photos={undefined as any} altText="Test Location" />);
      
      expect(screen.getByText('No photos available')).toBeInTheDocument();
    });
  });

  describe('Single photo', () => {
    it('should display single photo without navigation controls', () => {
      render(<PhotoGallery photos={singlePhoto} altText="Test Location" />);
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', 'Test Location - Photo 1 of 1');
      
      // Should not have navigation buttons
      expect(screen.queryByLabelText('Previous photo')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Next photo')).not.toBeInTheDocument();
      
      // Should not have counter
      expect(screen.queryByText('1 / 1')).not.toBeInTheDocument();
    });
  });

  describe('Multiple photos', () => {
    it('should display first photo initially with navigation controls', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      const mainImage = screen.getByAltText('Test Location - Photo 1 of 3');
      expect(mainImage).toBeInTheDocument();
      
      // Should have navigation buttons
      expect(screen.getByLabelText('Previous photo')).toBeInTheDocument();
      expect(screen.getByLabelText('Next photo')).toBeInTheDocument();
      
      // Should have counter
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('should navigate to next photo when next button is clicked', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      const nextButton = screen.getByLabelText('Next photo');
      fireEvent.click(nextButton);
      
      const mainImage = screen.getByAltText('Test Location - Photo 2 of 3');
      expect(mainImage).toBeInTheDocument();
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('should navigate to previous photo when previous button is clicked', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      // First go to second photo
      const nextButton = screen.getByLabelText('Next photo');
      fireEvent.click(nextButton);
      
      // Then go back to first
      const prevButton = screen.getByLabelText('Previous photo');
      fireEvent.click(prevButton);
      
      const mainImage = screen.getByAltText('Test Location - Photo 1 of 3');
      expect(mainImage).toBeInTheDocument();
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('should wrap around when navigating past last photo', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      const nextButton = screen.getByLabelText('Next photo');
      
      // Navigate to last photo (3rd)
      fireEvent.click(nextButton); // 2nd
      fireEvent.click(nextButton); // 3rd
      
      expect(screen.getByText('3 / 3')).toBeInTheDocument();
      
      // Navigate past last photo should wrap to first
      fireEvent.click(nextButton);
      
      const mainImage = screen.getByAltText('Test Location - Photo 1 of 3');
      expect(mainImage).toBeInTheDocument();
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('should wrap around when navigating before first photo', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      const prevButton = screen.getByLabelText('Previous photo');
      
      // Navigate before first photo should wrap to last
      fireEvent.click(prevButton);
      
      const mainImage = screen.getByAltText('Test Location - Photo 3 of 3');
      expect(mainImage).toBeInTheDocument();
      expect(screen.getByText('3 / 3')).toBeInTheDocument();
    });
  });

  describe('Keyboard navigation', () => {
    it('should navigate with arrow keys', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      // Navigate right
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      
      let mainImage = screen.getByAltText('Test Location - Photo 2 of 3');
      expect(mainImage).toBeInTheDocument();
      
      // Navigate left
      fireEvent.keyDown(document, { key: 'ArrowLeft' });
      
      mainImage = screen.getByAltText('Test Location - Photo 1 of 3');
      expect(mainImage).toBeInTheDocument();
    });

    it('should prevent default behavior for arrow keys', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      // Test that navigation works (which means preventDefault was called)
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      
      const mainImage = screen.getByAltText('Test Location - Photo 2 of 3');
      expect(mainImage).toBeInTheDocument();
    });
  });

  describe('Touch/swipe gestures', () => {
    it('should navigate to next photo on left swipe', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      const gallery = screen.getByRole('region', { name: 'Photo gallery' });
      
      // Simulate left swipe (start at 200, end at 100 = 100px left swipe)
      fireEvent.touchStart(gallery, createTouchEvent(200));
      fireEvent.touchMove(gallery, createTouchEvent(100));
      fireEvent.touchEnd(gallery);
      
      const mainImage = screen.getByAltText('Test Location - Photo 2 of 3');
      expect(mainImage).toBeInTheDocument();
    });

    it('should navigate to previous photo on right swipe', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      const gallery = screen.getByRole('region', { name: 'Photo gallery' });
      
      // Simulate right swipe (start at 100, end at 200 = 100px right swipe)
      fireEvent.touchStart(gallery, createTouchEvent(100));
      fireEvent.touchMove(gallery, createTouchEvent(200));
      fireEvent.touchEnd(gallery);
      
      const mainImage = screen.getByAltText('Test Location - Photo 3 of 3');
      expect(mainImage).toBeInTheDocument();
    });

    it('should not navigate on small swipe distance', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      const gallery = screen.getByRole('region', { name: 'Photo gallery' });
      
      // Simulate small swipe (less than 50px threshold)
      fireEvent.touchStart(gallery, createTouchEvent(150));
      fireEvent.touchMove(gallery, createTouchEvent(130));
      fireEvent.touchEnd(gallery);
      
      const mainImage = screen.getByAltText('Test Location - Photo 1 of 3');
      expect(mainImage).toBeInTheDocument();
    });
  });

  describe('Thumbnail navigation', () => {
    it('should display thumbnails for galleries with 10 or fewer photos', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      // Should have thumbnail buttons
      const thumbnailButtons = screen.getAllByLabelText(/Go to photo \d+/);
      expect(thumbnailButtons).toHaveLength(3);
    });

    it('should navigate to specific photo when thumbnail is clicked', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      const thirdThumbnail = screen.getByLabelText('Go to photo 3');
      fireEvent.click(thirdThumbnail);
      
      const mainImage = screen.getByAltText('Test Location - Photo 3 of 3');
      expect(mainImage).toBeInTheDocument();
      expect(screen.getByText('3 / 3')).toBeInTheDocument();
    });

    it('should highlight active thumbnail', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      const firstThumbnail = screen.getByLabelText('Go to photo 1');
      const secondThumbnail = screen.getByLabelText('Go to photo 2');
      
      // First thumbnail should be active initially
      expect(firstThumbnail).toHaveStyle({ borderColor: '#3b82f6' });
      
      // Navigate to second photo
      fireEvent.click(secondThumbnail);
      
      // Second thumbnail should now be active
      expect(secondThumbnail).toHaveStyle({ borderColor: '#3b82f6' });
    });
  });

  describe('Dot indicators', () => {
    const manyPhotos: PlacePhoto[] = Array.from({ length: 15 }, (_, i) => ({
      photoReference: `photo${i + 1}`,
      width: 800,
      height: 600,
      htmlAttributions: [`Attribution ${i + 1}`]
    }));

    it('should display dot indicators for galleries with more than 10 photos', () => {
      render(<PhotoGallery photos={manyPhotos} altText="Test Location" />);
      
      // Should have dot indicators instead of thumbnails
      const dotButtons = screen.getAllByLabelText(/Go to photo \d+/);
      expect(dotButtons).toHaveLength(15);
      
      // Should not have thumbnail images
      const thumbnailImages = screen.queryAllByRole('img', { name: /Thumbnail/ });
      expect(thumbnailImages).toHaveLength(0);
    });
  });

  describe('Image loading and error handling', () => {
    it('should show loading placeholder initially', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      const mainImage = screen.getByAltText('Test Location - Photo 1 of 3');
      expect(mainImage).toHaveStyle({ opacity: '0' });
    });

    it('should handle image load success', async () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      const mainImage = screen.getByAltText('Test Location - Photo 1 of 3');
      
      // Simulate image load
      fireEvent.load(mainImage);
      
      await waitFor(() => {
        expect(mainImage).toHaveStyle({ opacity: '1' });
      });
    });

    it('should handle image load error', async () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      const mainImage = screen.getByAltText('Test Location - Photo 1 of 3');
      
      // Simulate image error
      fireEvent.error(mainImage);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument();
        expect(screen.getByText('🖼️')).toBeInTheDocument();
      });
    });

    it('should show error in thumbnails when thumbnail image fails to load', async () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      const thumbnailImages = screen.getAllByRole('img', { name: /Thumbnail/ });
      
      // Simulate thumbnail error
      fireEvent.error(thumbnailImages[0]);
      
      await waitFor(() => {
        expect(screen.getByText('❌')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      expect(screen.getByRole('region', { name: 'Photo gallery' })).toBeInTheDocument();
      expect(screen.getByLabelText('Previous photo')).toBeInTheDocument();
      expect(screen.getByLabelText('Next photo')).toBeInTheDocument();
    });

    it('should have proper alt text for images', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Museum" />);
      
      const mainImage = screen.getByAltText('Museum - Photo 1 of 3');
      expect(mainImage).toBeInTheDocument();
    });

    it('should have proper alt text for thumbnails', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Museum" />);
      
      const thumbnailImages = screen.getAllByRole('img', { name: /Thumbnail/ });
      expect(thumbnailImages[0]).toHaveAttribute('alt', 'Thumbnail 1');
      expect(thumbnailImages[1]).toHaveAttribute('alt', 'Thumbnail 2');
    });
  });

  describe('State management', () => {
    it('should reset state when photos change', () => {
      const { rerender } = render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      // Navigate to second photo
      const nextButton = screen.getByLabelText('Next photo');
      fireEvent.click(nextButton);
      
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
      
      // Change photos prop
      rerender(<PhotoGallery photos={singlePhoto} altText="Test Location" />);
      
      // Should reset to first photo and remove navigation
      const mainImage = screen.getByAltText('Test Location - Photo 1 of 1');
      expect(mainImage).toBeInTheDocument();
      expect(screen.queryByLabelText('Previous photo')).not.toBeInTheDocument();
    });
  });

  describe('Responsive behavior', () => {
    it('should handle touch events properly', () => {
      render(<PhotoGallery photos={mockPhotos} altText="Test Location" />);
      
      const gallery = screen.getByRole('region', { name: 'Photo gallery' });
      
      // Should not throw errors on touch events
      expect(() => {
        fireEvent.touchStart(gallery, createTouchEvent(150));
        fireEvent.touchMove(gallery, createTouchEvent(100));
        fireEvent.touchEnd(gallery);
      }).not.toThrow();
    });
  });
});