import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';
import { ApiService } from '../services/api';
import { useAppState } from '../hooks/useAppState';
import { useScrollToTop, scrollToTop } from '../hooks/useScrollToTop';
import ProgressIndicator from './ProgressIndicator';
import { formatCityName, normalizeUserInput } from '../utils/cityFormatter';

interface CityInputProps extends ReturnType<typeof useAppState> { }

function CityInput({
  state,
  setLoading,
  setError,
  setCity,
  setSessionId,
  setSpots,
  goToStep
}: CityInputProps) {
  const [inputValue, setInputValue] = useState(state.city);
  const [hasBeenRejected, setHasBeenRejected] = useState(false);
  const navigate = useNavigate();

  // Scroll to top when component mounts
  useScrollToTop();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim()) {
      setError('Please enter a city name');
      return;
    }

    setLoading(true);

    try {
      const result = await ApiService.verifyCity(inputValue.trim());

      if (result.valid) {
        // Clear previous spots and selections when changing city
        setSpots([]);
        // Use the formatted city name from backend, or format the input if backend doesn't format it
        const formattedCity = result.city ? formatCityName(result.city) : formatCityName(inputValue.trim());
        setCity(formattedCity);
        // Generate a session ID for this user session
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        setSessionId(sessionId);
        goToStep('spots');
        navigate('/spots');
        // Scroll to top after navigation
        setTimeout(() => scrollToTop(), 100);
      } else {
        // This shouldn't happen since verifyCity throws an error for invalid cities
        setError(`"${normalizeUserInput(inputValue)}" is not a valid city. Please enter a specific city name.`);
      }
    } catch (error) {
      console.log('🚨 City verification error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify city. Please try again.';
      console.log('🚨 Setting error message:', errorMessage);
      setError(errorMessage);
      setHasBeenRejected(true); // Mark that user has been rejected once
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setInputValue(rawValue);
    if (state.error) {
      setError(null);
    }
  };

  const handleInputBlur = () => {
    // Format the city name when user finishes typing (on blur)
    if (inputValue.trim()) {
      const formatted = normalizeUserInput(inputValue);
      setInputValue(formatted);
    }
  };

  return (
    <div className="step-container">
      <ProgressIndicator currentStep="city" />

      {state.loading ? (
        <LoadingSpinner
          type="searching"
          message={`Verifying ${normalizeUserInput(inputValue)}...`}
        />
      ) : (
        <>
          <h2>🏙️ Where would you like to travel?</h2>
          <p>Enter a city name to get started with your personalized travel itinerary.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="city">City Name</label>
              <input
                id="city"
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                placeholder="e.g., Paris, Tokyo, New York"
                disabled={state.loading}
                autoFocus
              />
              {!state.error && hasBeenRejected && (
                <div className="input-hint">
                  💡 Enter a specific city name, not a country or region
                </div>
              )}
              {state.error && (
                <div className="error-message">
                  <div className="error-content">
                    <div className="error-text">{state.error}</div>
                    <div className="error-suggestions">
                      <strong>Valid examples:</strong> Tokyo, Paris, New York, London, Sydney
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="navigation-buttons">
              <div></div> {/* Empty div for spacing */}
              <button
                type="submit"
                className="btn-primary"
                disabled={state.loading || !inputValue.trim()}
              >
                Verify City
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default CityInput;