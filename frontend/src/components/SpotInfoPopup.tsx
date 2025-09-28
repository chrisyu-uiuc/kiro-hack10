import React, { useEffect, useCallback } from 'react';
import { Spot, GooglePlaceDetails, PopupErrorState, OpeningHours } from '@/types';
import PhotoGallery from './PhotoGallery';
import ReviewsSection from './ReviewsSection';

// Helper function to render opening hours
const renderOpeningHours = (openingHours?: OpeningHours): React.ReactNode => {
  if (!openingHours) {
    return <span style={noInfoStyles}>Hours not available</span>;
  }

  const currentStatus = openingHours.openNow ? 'Open now' : 'Closed';
  const statusColor = openingHours.openNow ? '#059669' : '#dc2626';

  return (
    <div>
      <div style={{ ...statusStyles, color: statusColor }}>
        {currentStatus}
      </div>
      {openingHours.weekdayText && openingHours.weekdayText.length > 0 && (
        <div style={hoursListStyles}>
          {openingHours.weekdayText.map((dayHours, index) => (
            <div key={index} style={dayHoursStyles}>
              {dayHours}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper function to generate Google Maps URL
const generateGoogleMapsUrl = (spotName: string, location: string): string => {
  const query = encodeURIComponent(`${spotName}, ${location}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

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

              {/* Reviews and Ratings Section */}
              {state.placeDetails?.reviews && state.placeDetails.rating ? (
                <div style={sectionStyles}>
                  <ReviewsSection 
                    reviews={state.placeDetails.reviews}
                    rating={state.placeDetails.rating}
                    totalReviews={state.placeDetails.userRatingsTotal}
                  />
                </div>
              ) : (
                <div style={sectionStyles}>
                  <ReviewsSection 
                    reviews={[]}
                    rating={0}
                    totalReviews={0}
                  />
                </div>
              )}

              {/* Practical Information Section */}
              <div style={sectionStyles}>
                <h3 style={sectionTitleStyles}>Practical Information</h3>
                <div style={practicalInfoContainerStyles}>
                  {/* Address */}
                  <div style={infoItemStyles}>
                    <span style={infoLabelStyles}>📍 Address:</span>
                    <span style={infoValueStyles}>
                      {state.placeDetails?.formattedAddress || spot.location || 'Address not available'}
                    </span>
                  </div>

                  {/* Opening Hours */}
                  <div style={infoItemStyles}>
                    <span style={infoLabelStyles}>🕒 Hours:</span>
                    <div style={infoValueStyles}>
                      {renderOpeningHours(state.placeDetails?.openingHours)}
                    </div>
                  </div>

                  {/* Website */}
                  {state.placeDetails?.websiteUri && (
                    <div style={infoItemStyles}>
                      <span style={infoLabelStyles}>🌐 Website:</span>
                      <a
                        href={state.placeDetails.websiteUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={linkStyles}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = linkHoverStyles.color!;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = linkStyles.color!;
                        }}
                      >
                        Visit Website
                      </a>
                    </div>
                  )}

                  {/* Google Maps Link */}
                  <div style={infoItemStyles}>
                    <span style={infoLabelStyles}>🗺️ Map:</span>
                    <a
                      href={state.placeDetails?.googleMapsUri || generateGoogleMapsUrl(spot.name, spot.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={linkStyles}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = linkHoverStyles.color!;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = linkStyles.color!;
                      }}
                    >
                      View on Google Maps
                    </a>
                  </div>
                </div>
              </div>

              {/* Basic Information Section */}
              <div style={sectionStyles}>
                <h3 style={sectionTitleStyles}>Basic Information</h3>
                <div style={basicInfoContainerStyles}>
                  <div style={infoItemStyles}>
                    <span style={infoLabelStyles}>Category:</span>
                    <span style={infoValueStyles}>{spot.category}</span>
                  </div>
                  <div style={infoItemStyles}>
                    <span style={infoLabelStyles}>Duration:</span>
                    <span style={infoValueStyles}>{spot.duration}</span>
                  </div>
                  <div style={infoItemStyles}>
                    <span style={infoLabelStyles}>Description:</span>
                    <span style={infoValueStyles}>{spot.description}</span>
                  </div>
                </div>
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

const sectionTitleStyles: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#111827',
  marginBottom: '8px',
};

const sectionStyles: React.CSSProperties = {
  marginBottom: '24px',
};

// New styles for practical information
const practicalInfoContainerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const basicInfoContainerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const infoItemStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  minHeight: '24px',
};

const infoLabelStyles: React.CSSProperties = {
  fontWeight: '500',
  color: '#374151',
  minWidth: '80px',
  fontSize: '14px',
};

const infoValueStyles: React.CSSProperties = {
  color: '#111827',
  fontSize: '14px',
  lineHeight: '1.4',
  flex: 1,
};

const linkStyles: React.CSSProperties = {
  color: '#3b82f6',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'color 0.2s',
};

const linkHoverStyles: React.CSSProperties = {
  color: '#1d4ed8',
};

const noInfoStyles: React.CSSProperties = {
  color: '#9ca3af',
  fontStyle: 'italic',
  fontSize: '14px',
};

const statusStyles: React.CSSProperties = {
  fontWeight: '600',
  fontSize: '14px',
  marginBottom: '4px',
};

const hoursListStyles: React.CSSProperties = {
  fontSize: '13px',
  color: '#6b7280',
  lineHeight: '1.3',
};

const dayHoursStyles: React.CSSProperties = {
  marginBottom: '2px',
};

export default SpotInfoPopup;