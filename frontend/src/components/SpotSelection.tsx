import { useEffect, useState } from 'react';
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
  const [loadingMessage, setLoadingMessage] = useState('');

  // Dynamic loading messages
  useEffect(() => {
    if (state.loading) {
      const messages = [
        `Exploring ${state.city}'s hidden gems...`,
        `Discovering local favorites in ${state.city}...`,
        `Finding unique experiences in ${state.city}...`,
        `Curating the best spots in ${state.city}...`,
        `Almost ready with your ${state.city} recommendations...`
      ];
      
      let messageIndex = 0;
      setLoadingMessage(messages[0]);
      
      const interval = setInterval(() => {
        messageIndex = (messageIndex + 1) % messages.length;
        setLoadingMessage(messages[messageIndex]);
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [state.loading, state.city]);

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
      console.log(`🔍 Load more response:`, result);
      
      if (result.spots.length > 0) {
        addMoreSpots(result.spots, result.noMoreSpots);
        // Clear any previous error messages
        if (state.error) {
          setError(null);
        }
      } else {
        // Even if no spots returned, we need to update the noMoreSpots state
        if (result.noMoreSpots || result.reachedLimit) {
          addMoreSpots([], true); // Update state to indicate no more spots available
          // Clear any previous error messages since this is not an error
          if (state.error) {
            setError(null);
          }
        } else {
          // Only show error if it's actually an error (not just "no more spots")
          if (result.message) {
            setError(result.message);
          } else {
            setError('No new spots found. You may have seen all available recommendations.');
          }
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
        <LoadingSpinner 
          type="discovering" 
          message={loadingMessage || `Discovering amazing spots in ${state.city}...`} 
        />
      </div>
    );
  }

  const selectedCount = state.selectedSpotIds.length;
  const totalSpots = state.spots.length;
  const canLoadMore = totalSpots < 40 && totalSpots > 0 && !state.noMoreSpots;
  
  console.log(`🔍 UI State - totalSpots: ${totalSpots}, noMoreSpots: ${state.noMoreSpots}, canLoadMore: ${canLoadMore}`);

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
              backgroundColor: state.loading ? '#f8f9fa' : 'transparent',
              color: state.loading ? '#666' : '#646cff',
              cursor: state.loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: state.loading ? 0.8 : 1,
              minWidth: '200px'
            }}
          >
            {state.loading ? (
              <>
                <span className="loading-icon-bounce" style={{ marginRight: '6px' }}>🔍</span>
                <span className="loading-icon-pulse" style={{ marginRight: '6px' }}>✨</span>
                <span className="loading-icon-bounce" style={{ marginRight: '6px' }}>🗺️</span>
                Discovering more spots...
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
            {state.loading ? (
              <span>
                <span className="loading-icon-pulse">🌟</span>
                {' '}Finding unique local gems...{' '}
                <span className="loading-icon-pulse">🏛️</span>
              </span>
            ) : (
              'Load 10 more spots • Up to 40 total'
            )}
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
          style={{
            minWidth: '200px',
            transition: 'all 0.3s ease'
          }}
        >
          {state.loading ? (
            <>
              <span className="loading-icon-spin" style={{ marginRight: '6px' }}>⚙️</span>
              <span className="loading-icon-bounce" style={{ marginRight: '6px' }}>📋</span>
              <span className="loading-icon-pulse" style={{ marginRight: '6px' }}>✨</span>
              Creating your itinerary...
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