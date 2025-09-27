import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';
import { ApiService } from '../services/api';
import { useAppState } from '../hooks/useAppState';
import { Spot } from '../types';

interface SpotSelectionProps extends ReturnType<typeof useAppState> { }

function SpotSelection({
  state,
  setLoading,
  setError,
  setSpots,
  addMoreSpots,
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

  const loadMoreSpots = async () => {
    if (!state.sessionId) return;

    setLoading(true);

    try {
      const result = await ApiService.loadMoreSpots(state.sessionId);
      if (result.spots.length > 0) {
        addMoreSpots(result.spots, result.noMoreSpots);
        // Clear any previous error messages
        if (state.error) {
          setError(null);
        }
      } else {
        // Handle different "no more spots" scenarios
        if (result.message) {
          setError(result.message);
        } else {
          setError('No new spots found. You may have seen all available recommendations.');
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load more spots. Please try again.');
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
      console.log('🔄 Storing selections:', selectedSpots.map(spot => spot.id));
      await ApiService.storeSelections(
        selectedSpots.map(spot => spot.id),
        state.sessionId
      );
      console.log('✅ Selections stored, navigating to itinerary');
      goToStep('itinerary');
      navigate('/itinerary');
    } catch (error) {
      console.error('❌ Error storing selections:', error);
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
  const totalSpots = state.spots.length;
  const canLoadMore = totalSpots < 40 && totalSpots > 0 && !state.noMoreSpots;

  return (
    <div className="step-container">
      <h2>🎯 Select Your Spots in {state.city}</h2>
      <p>
        Choose the places you'd like to visit. We've generated {totalSpots} recommendations for you.
        {selectedCount > 0 && (
          <span style={{ color: '#646cff', fontWeight: 'bold' }}>
            {' '}({selectedCount} selected)
          </span>
        )}
        {totalSpots >= 40 && (
          <span style={{ color: '#f39c12', fontWeight: 'bold', marginLeft: '8px' }}>
            (Maximum reached!)
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
              <div className="spot-checkmark">
                ✓
              </div>
            )}
          </div>
        ))}
      </div>

      {canLoadMore && (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadMoreSpots}
            disabled={state.loading}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '2px solid #646cff',
              backgroundColor: 'transparent',
              color: '#646cff',
              cursor: state.loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: state.loading ? 0.6 : 1
            }}
          >
            {state.loading ? (
              <>
                <span className="loading" style={{ width: '16px', height: '16px', marginRight: '8px' }}></span>
                Loading More...
              </>
            ) : (
              `🔄 Load More Spots (${totalSpots}/40)`
            )}
          </button>
          <div style={{
            fontSize: '14px',
            color: '#666',
            marginTop: '8px'
          }}>
            Load 10 more spots • Up to 40 total
          </div>
        </div>
      )}

      {(totalSpots >= 40 || state.noMoreSpots) && (
        <div style={{
          textAlign: 'center',
          margin: '20px 0',
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ color: '#f39c12', fontWeight: 'bold', fontSize: '16px' }}>
            {totalSpots >= 40 ? '🎉 Maximum spots reached!' : '✨ All unique spots found!'}
          </div>
          <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
            {totalSpots >= 40 
              ? 'You have 40 amazing spots to choose from. That\'s plenty for an incredible trip!'
              : `You have ${totalSpots} unique spots for ${state.city}. We've found all the best recommendations available!`
            }
          </div>
        </div>
      )}

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