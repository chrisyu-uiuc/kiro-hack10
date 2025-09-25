import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';
import { ApiService } from '../services/api';
import { useAppState } from '../hooks/useAppState';
import { Spot } from '../types';

interface SpotSelectionProps extends ReturnType<typeof useAppState> {}

function SpotSelection({ 
  state, 
  setLoading, 
  setError, 
  setSpots,
  toggleSpotSelection,
  getSelectedSpots,
  goToStep 
}: SpotSelectionProps) {
  const navigate = useNavigate();

  // Load spots when component mounts
  useEffect(() => {
    if (state.city && state.sessionId && state.spots.length === 0) {
      loadSpots();
    }
  }, [state.city, state.sessionId]);

  const loadSpots = async () => {
    if (!state.city || !state.sessionId) return;

    setLoading(true);
    
    try {
      const result = await ApiService.generateSpots(state.city, state.sessionId);
      setSpots(result.spots);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate spots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    const selectedSpots = getSelectedSpots();
    
    if (selectedSpots.length === 0) {
      setError('Please select at least one spot to continue.');
      return;
    }

    setLoading(true);
    
    try {
      await ApiService.storeSelections(
        selectedSpots.map(spot => spot.id), 
        state.sessionId
      );
      goToStep('itinerary');
      navigate('/itinerary');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to store selections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    goToStep('city');
    navigate('/');
  };

  const handleSpotClick = (spot: Spot) => {
    toggleSpotSelection(spot.id);
    if (state.error) {
      setError(null);
    }
  };

  if (state.loading && state.spots.length === 0) {
    return (
      <div className="step-container">
        <LoadingSpinner message={`Generating recommendations for ${state.city}...`} />
      </div>
    );
  }

  const selectedCount = state.selectedSpotIds.length;

  return (
    <div className="step-container">
      <h2>🎯 Select Your Spots in {state.city}</h2>
      <p>
        Choose the places you'd like to visit. We've generated {state.spots.length} recommendations for you.
        {selectedCount > 0 && (
          <span style={{ color: '#646cff', fontWeight: 'bold' }}>
            {' '}({selectedCount} selected)
          </span>
        )}
      </p>
      
      {state.error && (
        <div className="error-message" style={{ marginBottom: '20px' }}>
          {state.error}
        </div>
      )}

      <div className="spots-grid">
        {state.spots.map((spot) => (
          <div
            key={spot.id}
            className={`spot-card ${state.selectedSpotIds.includes(spot.id) ? 'selected' : ''}`}
            onClick={() => handleSpotClick(spot)}
          >
            <div className="spot-category">{spot.category}</div>
            <h3>{spot.name}</h3>
            <div className="spot-location">📍 {spot.location}</div>
            <div className="spot-description">{spot.description}</div>
            {state.selectedSpotIds.includes(spot.id) && (
              <div style={{ 
                position: 'absolute', 
                top: '10px', 
                right: '10px', 
                color: '#646cff',
                fontSize: '20px'
              }}>
                ✓
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="navigation-buttons">
        <button 
          type="button" 
          className="btn-secondary"
          onClick={handleBack}
          disabled={state.loading}
        >
          ← Back to City
        </button>
        <button 
          type="button" 
          className="btn-primary"
          onClick={handleNext}
          disabled={state.loading || selectedCount === 0}
        >
          {state.loading ? (
            <>
              <span className="loading" style={{ width: '16px', height: '16px', marginRight: '8px' }}></span>
              Processing...
            </>
          ) : (
            `Generate Itinerary (${selectedCount} spots) →`
          )}
        </button>
      </div>
    </div>
  );
}

export default SpotSelection;