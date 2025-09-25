import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';
import { ApiService } from '../services/api';
import { useAppState } from '../hooks/useAppState';

interface ItineraryDisplayProps extends ReturnType<typeof useAppState> {}

function ItineraryDisplay({ 
  state, 
  setLoading, 
  setError, 
  setItinerary,
  resetState 
}: ItineraryDisplayProps) {
  const navigate = useNavigate();

  // Generate itinerary when component mounts
  useEffect(() => {
    if (state.sessionId && !state.itinerary) {
      generateItinerary();
    }
  }, [state.sessionId, state.itinerary]);

  const generateItinerary = async () => {
    if (!state.sessionId) return;

    setLoading(true);
    
    try {
      const result = await ApiService.generateItinerary(state.sessionId);
      setItinerary(result.itinerary);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate itinerary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    resetState();
    navigate('/');
  };

  const handleBack = () => {
    navigate('/spots');
  };

  if (state.loading && !state.itinerary) {
    return (
      <div className="step-container">
        <LoadingSpinner message="Creating your personalized itinerary..." />
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

  if (!state.itinerary) {
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

  return (
    <div className="step-container">
      <h2>🗓️ {state.itinerary.title}</h2>
      <p>
        Your personalized itinerary for {state.city} • Total Duration: {state.itinerary.totalDuration}
      </p>
      
      <div className="itinerary-schedule">
        {state.itinerary.schedule.map((item, index) => (
          <div key={index} className="schedule-item">
            <div className="schedule-time">{item.time}</div>
            <div className="schedule-spot">{item.spot}</div>
            <div className="schedule-details">
              <span>⏱️ Duration: {item.duration}</span>
              <span>🚗 Transportation: {item.transportation}</span>
            </div>
            {item.notes && (
              <div className="schedule-notes">💡 {item.notes}</div>
            )}
          </div>
        ))}
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