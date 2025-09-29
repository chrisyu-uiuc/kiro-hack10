import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';
import { ApiService } from '../services/api';
import { useAppState } from '../hooks/useAppState';
import { useScrollToTop, scrollToTop } from '../hooks/useScrollToTop';
import ProgressIndicator from './ProgressIndicator';
import { OptimizedItinerary, ScheduleItem } from '../types';

interface ItineraryDisplayProps extends ReturnType<typeof useAppState> { }

function ItineraryDisplay({
  state,
  setLoading,
  setError,
  setOptimizedItinerary,
  resetState
}: ItineraryDisplayProps) {
  const navigate = useNavigate();

  // Scroll to top when component mounts
  useScrollToTop();

  // Generate itinerary when component mounts
  useEffect(() => {
    if (state.sessionId && !state.itinerary && !state.optimizedItinerary) {
      generateItinerary();
    }
  }, [state.sessionId, state.itinerary, state.optimizedItinerary]);

  const generateItinerary = async () => {
    if (!state.sessionId) return;

    setLoading(true);

    try {
      console.log('🚀 Generating optimized itinerary for session:', state.sessionId);
      
      // Use the optimized itinerary generation with real Google Maps integration
      const result = await ApiService.generateOptimizedItinerary(state.sessionId, {
        travelMode: 'transit', // Default to public transit for realistic city travel
        startTime: '09:00',
        visitDuration: 60
      });
      
      console.log('✅ Optimized itinerary result:', result);
      
      if (result.itinerary) {
        console.log('📋 Setting optimized itinerary:', result.itinerary);
        setOptimizedItinerary(result.itinerary);
      } else {
        console.warn('⚠️ No itinerary in result:', result);
        setError('No itinerary was generated. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error generating optimized itinerary:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate itinerary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    resetState();
    navigate('/');
    // Scroll to top after navigation
    setTimeout(() => scrollToTop(), 100);
  };

  const handleBack = () => {
    navigate('/spots');
    // Scroll to top after navigation
    setTimeout(() => scrollToTop(), 100);
  };

  const handleNavigate = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatTravelTime = (travelTime?: string) => {
    if (!travelTime) return null;
    return `🚶 ${travelTime}`;
  };

  const getTravelModeIcon = (mode?: string) => {
    switch (mode?.toLowerCase()) {
      case 'walking': return '🚶';
      case 'driving': return '🚗';
      case 'transit': return '🚌';
      default: return '🚶';
    }
  };

  const isOptimizedItinerary = (itinerary: any): itinerary is OptimizedItinerary => {
    return itinerary && 'route' in itinerary && 'totalTravelTime' in itinerary;
  };

  const renderScheduleItem = (item: ScheduleItem, index: number, isOptimized: boolean) => {
    return (
      <div key={index} className="schedule-item">
        <div className="schedule-header">
          <div className="schedule-time">
            {isOptimized && item.arrivalTime ? (
              <div className="enhanced-time">
                <div className="arrival-time">📍 Arrive: {item.arrivalTime}</div>
                {item.departureTime && (
                  <div className="departure-time">🚀 Depart: {item.departureTime}</div>
                )}
              </div>
            ) : (
              item.time
            )}
          </div>
          <div className="schedule-duration">⏱️ {item.duration}</div>
        </div>

        <div className="schedule-spot">{item.spot}</div>

        <div className="schedule-details">
          {item.transportation && (
            <span className="transportation">
              {getTravelModeIcon(item.transportation)} {item.transportation}
            </span>
          )}
          {isOptimized && item.travelTime && (
            <span className="travel-time">
              {formatTravelTime(item.travelTime)}
            </span>
          )}
        </div>

        {item.notes && (
          <div className="schedule-notes">💡 {item.notes}</div>
        )}

        {isOptimized && item.navigationUrl && (
          <div className="navigation-section">
            <button
              type="button"
              className="btn-navigation"
              onClick={() => handleNavigate(item.navigationUrl!)}
            >
              🧭 Navigate to {item.spot}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderOptimizationSummary = (itinerary: OptimizedItinerary) => {
    return (
      <div className="optimization-summary">
        <h3>🎯 Route Optimization Summary</h3>
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Total Travel Time:</span>
            <span className="stat-value">{itinerary.totalTravelTime}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Distance:</span>
            <span className="stat-value">
              {itinerary.route.totalDistance > 1000
                ? `${(itinerary.route.totalDistance / 1000).toFixed(1)} km`
                : `${itinerary.route.totalDistance} m`
              }
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Optimized Route:</span>
            <span className="stat-value">{itinerary.route.orderedSpots.length} stops</span>
          </div>
        </div>

        {itinerary.route.routeSteps.length > 0 && (
          <div className="route-steps">
            <h4>📍 Route Overview</h4>
            <div className="route-steps-list">
              {itinerary.route.routeSteps.map((step, index) => (
                <div key={index} className="route-step">
                  <div className="route-step-info">
                    <span className="route-from">{step.from}</span>
                    <span className="route-arrow">→</span>
                    <span className="route-to">{step.to}</span>
                  </div>
                  <div className="route-step-details">
                    <span className="route-travel-time">
                      {getTravelModeIcon(step.mode)} {step.travelTime.durationText}
                    </span>
                    <span className="route-distance">
                      📏 {step.travelTime.distanceText}
                    </span>
                    <button
                      type="button"
                      className="btn-route-navigate"
                      onClick={() => handleNavigate(step.navigationUrl)}
                    >
                      🧭 Navigate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (state.loading && !state.itinerary && !state.optimizedItinerary) {
    return (
      <div className="step-container">
        <LoadingSpinner
          type="processing"
          message="Crafting your perfect itinerary..."
        />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="step-container">
        <h2>❌ Error</h2>
        <div className="error-message" style={{ marginBottom: '20px' }}>
          {state.error}
        </div>
        <div className="navigation-buttons">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleBack}
          >
            ← Back to Spots
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={generateItinerary}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!state.itinerary && !state.optimizedItinerary) {
    return (
      <div className="step-container">
        <h2>No itinerary available</h2>
        <p>Please go back and select some spots first.</p>
        <button
          type="button"
          className="btn-primary"
          onClick={handleBack}
        >
          ← Back to Spots
        </button>
      </div>
    );
  }

  // Use optimized itinerary if available, otherwise fall back to basic itinerary
  const currentItinerary = state.optimizedItinerary || state.itinerary;
  const isOptimized = isOptimizedItinerary(currentItinerary);

  return (
    <div className="step-container">
      <ProgressIndicator currentStep="itinerary" />
      <h2>🗓️ {currentItinerary!.title}</h2>
      <p>
        Your personalized itinerary for {state.city} • Total Duration: {currentItinerary!.totalDuration}
        {isOptimized && (
          <span className="optimization-badge">✨ Optimized Route</span>
        )}
      </p>

      {isOptimized && renderOptimizationSummary(currentItinerary as OptimizedItinerary)}

      <div className="itinerary-schedule">
        {currentItinerary!.schedule.map((item, index) =>
          renderScheduleItem(item, index, isOptimized)
        )}
      </div>

      <div className="navigation-buttons">
        <button
          type="button"
          className="btn-secondary"
          onClick={handleStartOver}
        >
          🌍 Plan Another Trip
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => window.print()}
        >
          🖨️ Print Itinerary
        </button>
      </div>
    </div>
  );
}

export default ItineraryDisplay;