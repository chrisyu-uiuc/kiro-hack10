import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PlacePhoto } from '@/types';
import { OptimizedImage } from './OptimizedImage.js';
import { debounce } from '../utils/debounce.js';

interface PhotoGalleryProps {
  photos: PlacePhoto[];
  altText: string;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, altText }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Reset state when photos change
  useEffect(() => {
    setCurrentIndex(0);
    setImageErrors(new Set());
    setLoadedImages(new Set());
  }, [photos]);

  // Navigation functions
  const goToPrevious = useCallback(() => {
    if (!photos || photos.length === 0) return;
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? photos.length - 1 : prevIndex - 1
    );
  }, [photos]);

  const goToNext = useCallback(() => {
    if (!photos || photos.length === 0) return;
    setCurrentIndex((prevIndex) => 
      prevIndex === photos.length - 1 ? 0 : prevIndex + 1
    );
  }, [photos]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToPrevious();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToNext();
    }
  }, [goToPrevious, goToNext]);

  // Touch/swipe handling
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    touchEndX.current = event.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null || touchEndX.current === null) {
      return;
    }

    const deltaX = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // Swiped left - go to next
        goToNext();
      } else {
        // Swiped right - go to previous
        goToPrevious();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  }, [goToNext, goToPrevious]);

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Handle image load success
  const handleImageLoad = useCallback((index: number) => {
    setLoadedImages(prev => new Set([...prev, index]));
  }, []);

  // Handle image load error
  const handleImageError = useCallback((index: number) => {
    setImageErrors(prev => new Set([...prev, index]));
  }, []);

  // Generate photo URL with mobile optimization
  const getPhotoUrl = useCallback((photo: PlacePhoto, maxWidth: number = 800) => {
    if (!photo || !photo.photoReference) {
      return '';
    }
    
    // Optimize image size for mobile devices
    const isMobile = window.innerWidth <= 768;
    const optimizedWidth = isMobile ? Math.min(maxWidth, window.innerWidth * 2) : maxWidth;
    
    // In a real implementation, this would construct the Google Places Photo API URL
    // For now, we'll use the photoReference as a placeholder
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${optimizedWidth}&photoreference=${photo.photoReference}&key=YOUR_API_KEY`;
  }, []);

  // Handle direct navigation to specific photo
  const goToPhoto = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Debounced navigation to prevent rapid clicking
  const debouncedGoToNext = useCallback(
    debounce(() => {
      setCurrentIndex(prev => (prev + 1) % photos.length);
    }, 150),
    [photos.length]
  );

  const debouncedGoToPrevious = useCallback(
    debounce(() => {
      setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);
    }, 150),
    [photos.length]
  );

  if (!photos || photos.length === 0) {
    return (
      <div style={noPhotosContainerStyles}>
        <div style={noPhotosIconStyles}>📷</div>
        <p style={noPhotosTextStyles}>No photos available</p>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];
  const hasMultiplePhotos = photos.length > 1;

  return (
    <div 
      ref={galleryRef}
      style={galleryContainerStyles}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="region"
      aria-label="Photo gallery"
    >
      {/* Main photo display */}
      <div style={photoContainerStyles}>
        <OptimizedImage
          src={getPhotoUrl(currentPhoto)}
          alt={`${altText} - Photo ${currentIndex + 1} of ${photos.length}`}
          style={photoStyles}
          onLoad={() => handleImageLoad(currentIndex)}
          onError={() => handleImageError(currentIndex)}
          lazy={true}
          quality="high"
          placeholder="Loading photo..."
        />

        {/* Navigation controls */}
        {hasMultiplePhotos && (
          <>
            <button
              onClick={debouncedGoToPrevious}
              style={{...navButtonStyles, ...prevButtonStyles}}
              aria-label="Previous photo"
              type="button"
            >
              ‹
            </button>
            <button
              onClick={debouncedGoToNext}
              style={{...navButtonStyles, ...nextButtonStyles}}
              aria-label="Next photo"
              type="button"
            >
              ›
            </button>
          </>
        )}

        {/* Photo counter */}
        {hasMultiplePhotos && (
          <div style={counterStyles}>
            {currentIndex + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* Thumbnail navigation */}
      {hasMultiplePhotos && photos.length <= 10 && (
        <div style={thumbnailContainerStyles}>
          {photos.map((photo, index) => (
            <button
              key={`${photo.photoReference}-${index}`}
              onClick={() => goToPhoto(index)}
              style={{
                ...thumbnailButtonStyles,
                ...(index === currentIndex ? activeThumbnailStyles : {})
              }}
              aria-label={`Go to photo ${index + 1}`}
              type="button"
            >
              {imageErrors.has(index) ? (
                <div style={thumbnailErrorStyles}>❌</div>
              ) : (
                <img
                  src={getPhotoUrl(photo, 150)}
                  alt={`Thumbnail ${index + 1}`}
                  style={thumbnailImageStyles}
                  onError={() => handleImageError(index)}
                  loading="lazy"
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Dot indicators for many photos */}
      {hasMultiplePhotos && photos.length > 10 && (
        <div style={dotsContainerStyles}>
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => goToPhoto(index)}
              style={{
                ...dotStyles,
                ...(index === currentIndex ? activeDotStyles : {})
              }}
              aria-label={`Go to photo ${index + 1}`}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Styles
const galleryContainerStyles: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const photoContainerStyles: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: window.innerWidth <= 768 ? '250px' : '300px', // Smaller height on mobile
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  touchAction: 'pan-x', // Allow horizontal panning for swipe gestures
};

const photoStyles: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  transition: 'opacity 0.3s ease',
};

const loadingPlaceholderStyles: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f9fafb',
};

const loadingSpinnerStyles: React.CSSProperties = {
  width: '32px',
  height: '32px',
  border: '3px solid #e5e7eb',
  borderTop: '3px solid #3b82f6',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
};

const errorPlaceholderStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#6b7280',
  gap: '8px',
};

const errorIconStyles: React.CSSProperties = {
  fontSize: '32px',
  opacity: 0.5,
};

const errorTextStyles: React.CSSProperties = {
  fontSize: '14px',
  margin: 0,
};

const noPhotosContainerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  color: '#6b7280',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  border: '2px dashed #d1d5db',
};

const noPhotosIconStyles: React.CSSProperties = {
  fontSize: '48px',
  marginBottom: '12px',
  opacity: 0.5,
};

const noPhotosTextStyles: React.CSSProperties = {
  fontSize: '16px',
  margin: 0,
  fontWeight: '500',
};

const navButtonStyles: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  color: 'white',
  border: 'none',
  width: window.innerWidth <= 768 ? '44px' : '40px', // Larger touch targets on mobile
  height: window.innerWidth <= 768 ? '44px' : '40px',
  borderRadius: '50%',
  fontSize: window.innerWidth <= 768 ? '28px' : '24px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  zIndex: 2,
  touchAction: 'manipulation', // Prevent double-tap zoom
};

const prevButtonStyles: React.CSSProperties = {
  left: '12px',
};

const nextButtonStyles: React.CSSProperties = {
  right: '12px',
};

const counterStyles: React.CSSProperties = {
  position: 'absolute',
  bottom: '12px',
  right: '12px',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: 'white',
  padding: '4px 8px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: '500',
};

const thumbnailContainerStyles: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  overflowX: 'auto',
  padding: '4px 0',
  scrollbarWidth: 'thin',
};

const thumbnailButtonStyles: React.CSSProperties = {
  width: '60px',
  height: '60px',
  border: '2px solid transparent',
  borderRadius: '6px',
  overflow: 'hidden',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  flexShrink: 0,
  backgroundColor: '#f3f4f6',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const activeThumbnailStyles: React.CSSProperties = {
  borderColor: '#3b82f6',
  boxShadow: '0 0 0 1px #3b82f6',
};

const thumbnailImageStyles: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const thumbnailErrorStyles: React.CSSProperties = {
  fontSize: '16px',
  color: '#dc2626',
};

const dotsContainerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '8px',
  padding: '8px 0',
};

const dotStyles: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: '#d1d5db',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const activeDotStyles: React.CSSProperties = {
  backgroundColor: '#3b82f6',
  transform: 'scale(1.2)',
};

export default PhotoGallery;