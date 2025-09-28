import React, { useEffect, useCallback } from 'react';
import { Spot, GooglePlaceDetails, PopupErrorState } from '@/types';
import PhotoGallery from './PhotoGallery';

interface SpotInfoPopupProps {
  spot: Spot;
  isOpen: boolean;
  onClose: () => void;
}

interface SpotInfoPopupState {
  loading: boolean;
  placeDetails: GooglePlaceDetails | null;
  error: PopupErrorState | null;
}

const SpotInfoPopup: React.FC<SpotInfoPopupProps> = ({ spot, isOpen, onClose }) => {
  const [state, setState] = React.useState<SpotInfoPopupState>({
    loading: false,
    placeDetails: null,
    error: null
  });

  // Handle ESC key press to close popup
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Handle click outside popup to close
  const handleOverlayClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Add/remove event listeners for keyboard navigation
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when popup is open
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  // Fetch spot details when popup opens
  useEffect(() => {
    if (isOpen && spot) {
      // Check if we already have cached Google Places data
      if (spot.googlePlaceDetails) {
        setState({
          loading: false,
          placeDetails: spot.googlePlaceDetails,
          error: null
        });
        return;
      }

      // Set loading state
      setState({
        loading: true,
        placeDetails: null,
        error: null
      });

      // TODO: This will be implemented in task 9 - API service integration
      // For now, simulate loading state
      const timer = setTimeout(() => {
        setState({
          loading: false,
          placeDetails: null,
          error: {
            hasError: true,
            errorType: 'unknown',
            message: 'Spot details will be available once API integration is complete',
            canRetry: false
          }
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, spot]);

  // Reset state when popup closes
  useEffect(() => {
    if (!isOpen) {
      setState({
        loading: false,
        placeDetails: null,
        error: null
      });
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="popup-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-title"
      style={overlayStyles}
    >
      <div 
        className="popup-content"
        style={contentStyles}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={headerStyles}>
          <h2 id="popup-title" style={titleStyles}>
            {spot.name}
          </h2>
          <button
            onClick={onClose}
            style={closeButtonStyles}
            aria-label="Close popup"
            type="button"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={bodyStyles}>
          {state.loading && (
            <div style={loadingContainerStyles}>
              <div style={spinnerStyles}></div>
              <p style={loadingTextStyles}>Loading spot details...</p>
            </div>
          )}

          {state.error && (
            <div style={errorContainerStyles}>
              <h3 style={errorTitleStyles}>Unable to load details</h3>
              <p style={errorMessageStyles}>{state.error.message}</p>
              {state.error.canRetry && (
                <button 
                  style={retryButtonStyles}
                  onClick={() => {
                    // TODO: Implement retry logic in task 9
                    console.log('Retry functionality will be implemented in task 9');
                  }}
                >
                  Try Again
                </button>
              )}
            </div>
          )}

          {!state.loading && !state.error && (
            <div style={basicInfoStyles}>
              {/* Photo Gallery Section */}
              {state.placeDetails?.photos && state.placeDetails.photos.length > 0 ? (
                <div style={sectionStyles}>
                  <h3 style={sectionTitleStyles}>Photos</h3>
                  <PhotoGallery 
                    photos={state.placeDetails.photos} 
                    altText={spot.name}
                  />
                </div>
              ) : (
                <div style={sectionStyles}>
                  <h3 style={sectionTitleStyles}>Photos</h3>
                  <PhotoGallery 
                    photos={[]} 
                    altText={spot.name}
                  />
                </div>
              )}

              <div style={infoSectionStyles}>
                <h3 style={sectionTitleStyles}>Basic Information</h3>
                <p><strong>Category:</strong> {spot.category}</p>
                <p><strong>Location:</strong> {spot.location}</p>
                <p><strong>Duration:</strong> {spot.duration}</p>
                <p><strong>Description:</strong> {spot.description}</p>
              </div>
              
              <div style={placeholderStyles}>
                <p>Detailed information including reviews and opening hours will be available once the Google Places API integration is complete.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Styles
const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px',
};

const contentStyles: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '12px',
  maxWidth: '600px',
  width: '100%',
  maxHeight: '90vh',
  overflow: 'hidden',
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: '1px solid #e5e7eb',
  backgroundColor: '#f9fafb',
};

const titleStyles: React.CSSProperties = {
  margin: 0,
  fontSize: '1.5rem',
  fontWeight: '600',
  color: '#111827',
  flex: 1,
  paddingRight: '16px',
};

const closeButtonStyles: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '24px',
  cursor: 'pointer',
  color: '#6b7280',
  padding: '4px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  transition: 'all 0.2s',
};

const bodyStyles: React.CSSProperties = {
  padding: '24px',
  overflow: 'auto',
  flex: 1,
};

const loadingContainerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
};

const spinnerStyles: React.CSSProperties = {
  width: '40px',
  height: '40px',
  border: '4px solid #f3f4f6',
  borderTop: '4px solid #3b82f6',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  marginBottom: '16px',
};

const loadingTextStyles: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '14px',
  margin: 0,
};

const errorContainerStyles: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px 20px',
};

const errorTitleStyles: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '18px',
  fontWeight: '600',
  marginBottom: '8px',
};

const errorMessageStyles: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '14px',
  marginBottom: '16px',
  lineHeight: '1.5',
};

const retryButtonStyles: React.CSSProperties = {
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  transition: 'background-color 0.2s',
};

const basicInfoStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const infoSectionStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const sectionTitleStyles: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#111827',
  marginBottom: '8px',
};

const placeholderStyles: React.CSSProperties = {
  backgroundColor: '#f9fafb',
  padding: '16px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
};

const sectionStyles: React.CSSProperties = {
  marginBottom: '24px',
};

export default SpotInfoPopup;