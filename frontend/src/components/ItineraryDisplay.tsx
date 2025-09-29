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

  const getTravelModeIcon = (mode?: string) => {
    switch (mode?.toLowerCase()) {
      case 'walking': return '🚶';
      case 'driving': return '🚗';
      case 'transit': return '🚶'; // Changed from 🚌 to 🚶
      default: return '🚶';
    }
  };

  const isOptimizedItinerary = (itinerary: any): itinerary is OptimizedItinerary => {
    return itinerary && 'route' in itinerary && 'totalTravelTime' in itinerary;
  };

  const getOriginalSpotDescription = (spotName: string): string | null => {
    const originalSpot = state.spots.find(spot => 
      spot.name.toLowerCase() === spotName.toLowerCase() ||
      spotName.toLowerCase().includes(spot.name.toLowerCase()) ||
      spot.name.toLowerCase().includes(spotName.toLowerCase())
    );
    return originalSpot?.description || null;
  };

  const formatTimeWithDay = (time: string, index: number, schedule: ScheduleItem[]): { time: string; day: number } => {
    const [hours, minutes] = time.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    
    // Check if this is the start of a new day by looking at previous items
    let currentDay = 0;
    let foundNewDayTrigger = false;
    
    // Look at previous items to determine if we've crossed into a new day
    for (let i = 0; i < index; i++) {
      const prevItem = schedule[i];
      const prevTime = prevItem.arrivalTime || prevItem.time;
      const [prevHours] = prevTime.split(':').map(Number);
      const prevTimeInMinutes = prevHours * 60 + parseInt(prevTime.split(':')[1]);
      
      // If previous time was past 8pm (20:00), the next item starts a new day
      if (prevTimeInMinutes >= 20 * 60) {
        foundNewDayTrigger = true;
      }
    }
    
    // If we found a trigger for a new day, increment the day counter
    if (foundNewDayTrigger) {
      currentDay = 1;
    }
    
    // If we're in a new day (day > 0), ensure the time starts at 09:00 or later
    if (currentDay > 0 && timeInMinutes < 9 * 60) {
      return { time: '09:00', day: currentDay };
    }
    
    return { time, day: currentDay };
  };

  const getDayLabel = (day: number): string => {
    if (day === 0) return '';
    if (day === 1) return 'Day 2 - ';
    return `Day ${day + 1} - `;
  };

  const renderScheduleItem = (item: ScheduleItem, index: number, isOptimized: boolean, schedule: ScheduleItem[]) => {
    const originalDescription = getOriginalSpotDescription(item.spot);
    
    // Determine day based on arrival time
    const timeInfo = isOptimized && item.arrivalTime 
      ? formatTimeWithDay(item.arrivalTime, index, schedule)
      : formatTimeWithDay(item.time, index, schedule);
    
    return (
      <div key={index} className="schedule-item">
        <div className="schedule-header">
          <div className="schedule-time">
            {isOptimized && item.arrivalTime ? (
              <div className="enhanced-time">
                <div className="arrival-time">
                  {getDayLabel(timeInfo.day)}📍 Arrive: {timeInfo.time}
                </div>
                {item.departureTime && (
                  <div className="departure-time">🚀 Depart: {item.departureTime}</div>
                )}
              </div>
            ) : (
              <span>{getDayLabel(timeInfo.day)}{timeInfo.time}</span>
            )}
          </div>
          <div className="schedule-duration">⏱️ {item.duration}</div>
        </div>

        <div className="schedule-spot-header">
          <div className="schedule-spot">{item.spot}</div>
          <button
            type="button"
            className="btn-spot-navigate"
            onClick={() => {
              const spotName = encodeURIComponent(item.spot);
              const cityName = encodeURIComponent(state.city);
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${spotName}+${cityName}`;
              handleNavigate(mapsUrl);
            }}
            title={`Get directions to ${item.spot}`}
          >
            🗺️
          </button>
        </div>

        {originalDescription && (
          <div className="schedule-description">{originalDescription}</div>
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
      </p>

      <div className="itinerary-schedule">
        {currentItinerary!.schedule.map((item, index) =>
          renderScheduleItem(item, index, isOptimized, currentItinerary!.schedule)
        )}
      </div>

      {isOptimized && renderOptimizationSummary(currentItinerary as OptimizedItinerary)}

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