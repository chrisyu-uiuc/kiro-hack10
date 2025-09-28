import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Spot, GooglePlaceDetails, PopupErrorState, OpeningHours } from '@/types';
import PhotoGallery from './PhotoGallery';
import ReviewsSection from './ReviewsSection';
import SpotInfoErrorBoundary from './SpotInfoErrorBoundary';
import ApiService from '@/services/api';
import { usePerformanceMonitor } from '../utils/performance.js';
import { 
  classifyError, 
  getErrorMessage, 
  canRetryError, 
  getRetryDelay, 
  createFallbackContent, 
  shouldShowFallback,
  logError 
} from '@/utils/errorHandling';

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
  retryCount: number;
  isRetrying: boolean;
  showFallback: boolean;
}

// Mobile detection utility
const isMobile = (): boolean => {
  // In test environment, check for explicit mobile flag
  if (typeof window !== 'undefined' && (window as any).__TEST_MOBILE__) {
    return (window as any).__TEST_MOBILE__;
  }
  return window.innerWidth <= 768 || 'ontouchstart' in window;
};

// Viewport utilities
const getViewportHeight = (): number => {
  return window.visualViewport?.height || window.innerHeight;
};

const getViewportWidth = (): number => {
  return window.visualViewport?.width || window.innerWidth;
};

const SpotInfoPopup: React.FC<SpotInfoPopupProps> = ({ spot, isOpen, onClose }) => {
  const { measureRender, endMeasure } = usePerformanceMonitor('SpotInfoPopup');
  
  const [state, setState] = useState<SpotInfoPopupState>({
    loading: false,
    placeDetails: null,
    error: null,
    retryCount: 0,
    isRetrying: false,
    showFallback: false
  });

  // Mobile-specific state
  const [isMobileDevice, setIsMobileDevice] = useState(isMobile());
  const [viewportHeight, setViewportHeight] = useState(getViewportHeight());
  const [isClosing, setIsClosing] = useState(false);
  
  // Touch handling refs
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastTouchTime = useRef<number>(0);

  // Handle ESC key press to close popup
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  }, []);

  // Enhanced close handler with animation
  const handleClose = useCallback(() => {
    if (isClosing) return;
    
    setIsClosing(true);
    // Add a small delay for close animation
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  }, [onClose, isClosing]);

  // Handle click outside popup to close - disabled on mobile
  const handleOverlayClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Only allow overlay click to close on desktop
    if (!isMobileDevice && event.target === event.currentTarget) {
      handleClose();
    }
  }, [handleClose, isMobileDevice]);

  // Touch event handlers - DISABLED for mobile to prevent accidental closing
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    // Disabled - only allow closing via close button
    return;
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    // Disabled - only allow closing via close button
    return;
  }, []);

  const handleTouchEnd = useCallback(() => {
    // Disabled - only allow closing via close button
    return;
  }, []);

  // Viewport change handler for mobile
  const handleViewportChange = useCallback(() => {
    setIsMobileDevice(isMobile());
    setViewportHeight(getViewportHeight());
  }, []);

  // Debounced resize handler
  const handleResize = useCallback(() => {
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(handleViewportChange, 100);
  }, [handleViewportChange]);

  // Add/remove event listeners for keyboard navigation and mobile handling
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleResize);
      
      // Simple scroll prevention - just hide overflow
      document.body.style.overflow = 'hidden';
      
      // Handle viewport changes on mobile
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleViewportChange);
      }
    } else {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      
      // Simply restore overflow - no scroll position manipulation
      document.body.style.overflow = '';
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      
      // Cleanup on unmount
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
    };
  }, [isOpen, handleKeyDown, handleResize, handleViewportChange]);

  // Fetch spot details with comprehensive error handling
  const fetchSpotDetails = useCallback(async (isRetry: boolean = false) => {
    if (!spot) return;

    try {
      // Check if we already have cached Google Places data and it's not a retry
      if (spot.googlePlaceDetails && !isRetry) {
        setState(prev => ({
          ...prev,
          loading: false,
          placeDetails: spot.googlePlaceDetails!,
          error: null,
          showFallback: false
        }));
        return;
      }

      // Set loading state
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        isRetrying: isRetry,
        showFallback: false
      }));

      // Fetch spot details from API
      const placeDetails = await ApiService.fetchSpotDetails(
        spot.id,
        spot.name,
        spot.location
      );

      // Success - update state with fetched data
      setState(prev => ({
        ...prev,
        loading: false,
        placeDetails: placeDetails || null,
        error: null,
        retryCount: 0,
        isRetrying: false,
        showFallback: false
      }));

    } catch (error) {
      // Log error for debugging
      logError(error, `Fetching spot details for ${spot.name}`);

      // Classify the error
      const errorState = classifyError(error);
      
      // Enhance error message
      const enhancedError = {
        ...errorState,
        message: getErrorMessage(errorState.errorType, errorState.message),
        canRetry: canRetryError(errorState.errorType)
      };

      // Determine if we should show fallback content
      const showFallback = shouldShowFallback(errorState.errorType);
      let fallbackData: GooglePlaceDetails | null = null;

      if (showFallback) {
        // Create fallback content with basic information
        const fallbackContent = createFallbackContent(spot.name, spot.location);
        fallbackData = {
          placeId: spot.placeId || spot.id,
          ...fallbackContent
        } as GooglePlaceDetails;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        placeDetails: fallbackData,
        error: enhancedError,
        isRetrying: false,
        showFallback,
        retryCount: isRetry ? prev.retryCount + 1 : prev.retryCount
      }));
    }
  }, [spot]);

  // Retry function with exponential backoff
  const handleRetry = useCallback(async () => {
    if (!state.error || !canRetryError(state.error.errorType)) {
      return;
    }

    const delay = getRetryDelay(state.error.errorType, state.retryCount);
    
    // Show retry delay to user if it's significant
    if (delay > 2000) {
      setState(prev => ({
        ...prev,
        error: prev.error ? {
          ...prev.error,
          message: `Retrying in ${Math.ceil(delay / 1000)} seconds...`
        } : null
      }));

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    await fetchSpotDetails(true);
  }, [state.error, state.retryCount]); // Remove fetchSpotDetails to avoid infinite loop

  // Fetch spot details when popup opens
  useEffect(() => {
    if (isOpen && spot) {
      const measureId = measureRender('mount');
      fetchSpotDetails(false).finally(() => {
        endMeasure(measureId);
      });
    }
  }, [isOpen, spot?.id]); // Only depend on isOpen and spot.id to avoid infinite loop

  // Reset state when popup closes
  useEffect(() => {
    if (!isOpen) {
      setState({
        loading: false,
        placeDetails: null,
        error: null,
        retryCount: 0,
        isRetrying: false,
        showFallback: false
      });
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      ref={overlayRef}
      className="popup-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="popup-title"
      style={{
        ...overlayStyles,
        ...(isMobileDevice ? mobileOverlayStyles : {}),
        ...(isClosing ? closingOverlayStyles : {})
      }}
    >
      <div 
        ref={contentRef}
        className="popup-content"
        style={{
          ...contentStyles,
          ...(isMobileDevice ? mobileContentStyles(viewportHeight) : {}),
          ...(isClosing ? closingContentStyles : {})
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={headerStyles}>
          <h2 id="popup-title" style={titleStyles}>
            {spot.name}
          </h2>
          <button
            onClick={handleClose}
            style={{
              ...closeButtonStyles,
              ...(isMobileDevice ? mobileCloseButtonStyles : {})
            }}
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

          {state.error && !state.showFallback && (
            <div style={errorContainerStyles}>
              <div style={errorIconStyles}>⚠️</div>
              <h3 style={errorTitleStyles}>
                {state.error.errorType === 'network' ? 'Connection Problem' :
                 state.error.errorType === 'not-found' ? 'Information Not Available' :
                 state.error.errorType === 'rate-limit' ? 'Service Busy' :
                 state.error.errorType === 'server-error' ? 'Server Issue' :
                 'Unable to Load Details'}
              </h3>
              <p style={errorMessageStyles}>{state.error.message}</p>
              
              {state.error.canRetry && (
                <div style={errorActionsStyles}>
                  <button 
                    style={state.isRetrying ? retryButtonDisabledStyles : retryButtonStyles}
                    onClick={handleRetry}
                    disabled={state.isRetrying}
                    onMouseEnter={(e) => {
                      if (!state.isRetrying) {
                        e.currentTarget.style.backgroundColor = retryButtonHoverStyles.backgroundColor!;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!state.isRetrying) {
                        e.currentTarget.style.backgroundColor = retryButtonStyles.backgroundColor!;
                      }
                    }}
                  >
                    {state.isRetrying ? 'Retrying...' : 'Try Again'}
                  </button>
                  
                  {state.retryCount > 0 && (
                    <span style={retryCountStyles}>
                      Attempt {state.retryCount + 1}
                    </span>
                  )}
                </div>
              )}

              {state.error.retryAfter && (
                <p style={retryAfterStyles}>
                  Please wait {state.error.retryAfter} seconds before trying again.
                </p>
              )}

              {/* Fallback option for certain error types */}
              {shouldShowFallback(state.error.errorType) && (
                <div style={fallbackOptionStyles}>
                  <button
                    style={fallbackButtonStyles}
                    onClick={() => {
                      const fallbackData = createFallbackContent(spot.name, spot.location);
                      setState(prev => ({
                        ...prev,
                        placeDetails: {
                          placeId: spot.placeId || spot.id,
                          ...fallbackData
                        } as GooglePlaceDetails,
                        showFallback: true,
                        error: null
                      }));
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = fallbackButtonHoverStyles.backgroundColor!;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = fallbackButtonStyles.backgroundColor!;
                    }}
                  >
                    Show Basic Information
                  </button>
                </div>
              )}
            </div>
          )}

          {!state.loading && (!state.error || state.showFallback) && (
            <div style={basicInfoStyles}>
              {/* Fallback notice */}
              {state.showFallback && (
                <div style={fallbackNoticeStyles}>
                  <div style={fallbackNoticeIconStyles}>
                    <div className="info-icon"></div>
                  </div>
                  <div style={fallbackNoticeContentStyles}>
                    <p style={fallbackNoticeTitleStyles}>Limited Information Available</p>
                    <p style={fallbackNoticeMessageStyles}>
                      We're showing basic information for this location. Some details may not be available.
                    </p>
                  </div>
                </div>
              )}
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

// Wrap the component with error boundary
const SpotInfoPopupWithErrorBoundary: React.FC<SpotInfoPopupProps> = (props) => {
  return (
    <SpotInfoErrorBoundary
      onError={(error, errorInfo) => {
        logError(error, 'SpotInfoPopup Error Boundary');
        console.error('Error Info:', errorInfo);
      }}
    >
      <SpotInfoPopup {...props} />
    </SpotInfoErrorBoundary>
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
  transition: 'background-color 0.2s ease',
};

const mobileOverlayStyles: React.CSSProperties = {
  padding: 0,
  alignItems: 'flex-end',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
};

const closingOverlayStyles: React.CSSProperties = {
  backgroundColor: 'rgba(0, 0, 0, 0)',
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
  transition: 'transform 0.2s ease, opacity 0.2s ease',
};

const mobileContentStyles = (viewportHeight: number): React.CSSProperties => ({
  maxWidth: '100%',
  width: '100%',
  maxHeight: `${Math.min(viewportHeight * 0.95, viewportHeight - 40)}px`,
  height: 'auto',
  minHeight: '60vh',
  borderRadius: '16px 16px 0 0',
  margin: 0,
  boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
  transform: 'translateY(0)',
});

const closingContentStyles: React.CSSProperties = {
  transform: 'translateY(100%) scale(0.95)',
  opacity: 0,
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px 24px',
  borderBottom: '1px solid #e5e7eb',
  backgroundColor: '#f9fafb',
  position: 'relative',
  flexShrink: 0,
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

const mobileCloseButtonStyles: React.CSSProperties = {
  width: '44px',
  height: '44px',
  fontSize: '28px',
  backgroundColor: 'rgba(107, 114, 128, 0.1)',
  borderRadius: '8px',
};

const dragIndicatorStyles: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '40px',
  height: '4px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const dragHandleStyles: React.CSSProperties = {
  width: '100%',
  height: '100%',
  backgroundColor: '#d1d5db',
  borderRadius: '2px',
};

const bodyStyles: React.CSSProperties = {
  padding: '24px',
  overflow: 'auto',
  flex: 1,
  WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
  overscrollBehavior: 'contain', // Prevent scroll chaining
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
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const errorIconStyles: React.CSSProperties = {
  fontSize: '32px',
  marginBottom: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
};

const errorTitleStyles: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '18px',
  fontWeight: '600',
  marginBottom: '8px',
  margin: '0 0 8px 0',
};

const errorMessageStyles: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '14px',
  marginBottom: '20px',
  lineHeight: '1.5',
  margin: '0 0 20px 0',
  maxWidth: '400px',
};

const errorActionsStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '16px',
};

const retryButtonStyles: React.CSSProperties = {
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  padding: '10px 20px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  transition: 'background-color 0.2s',
};

const retryButtonHoverStyles: React.CSSProperties = {
  backgroundColor: '#2563eb',
};

const retryButtonDisabledStyles: React.CSSProperties = {
  ...retryButtonStyles,
  backgroundColor: '#9ca3af',
  cursor: 'not-allowed',
};

const retryCountStyles: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b7280',
  fontStyle: 'italic',
};

const retryAfterStyles: React.CSSProperties = {
  fontSize: '12px',
  color: '#f59e0b',
  fontStyle: 'italic',
  margin: '8px 0 0 0',
};

const fallbackOptionStyles: React.CSSProperties = {
  marginTop: '16px',
  paddingTop: '16px',
  borderTop: '1px solid #e5e7eb',
};

const fallbackButtonStyles: React.CSSProperties = {
  backgroundColor: '#f3f4f6',
  color: '#374151',
  border: '1px solid #d1d5db',
  padding: '8px 16px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '500',
  transition: 'background-color 0.2s',
};

const fallbackButtonHoverStyles: React.CSSProperties = {
  backgroundColor: '#e5e7eb',
};

const fallbackNoticeStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  backgroundColor: '#fef3c7',
  border: '1px solid #f59e0b',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '20px',
};

const fallbackNoticeIconStyles: React.CSSProperties = {
  marginTop: '1px',
  marginRight: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};



const fallbackNoticeContentStyles: React.CSSProperties = {
  flex: 1,
};

const fallbackNoticeTitleStyles: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#92400e',
  margin: '0 0 4px 0',
};

const fallbackNoticeMessageStyles: React.CSSProperties = {
  fontSize: '13px',
  color: '#92400e',
  margin: 0,
  lineHeight: '1.4',
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

export default SpotInfoPopupWithErrorBoundary;