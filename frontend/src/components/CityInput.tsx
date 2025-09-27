import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';
import { ApiService } from '../services/api';
import { useAppState } from '../hooks/useAppState';
import { useScrollToTop, scrollToTop } from '../hooks/useScrollToTop';
import ProgressIndicator from './ProgressIndicator';

interface CityInputProps extends ReturnType<typeof useAppState> {}

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
        setCity(result.city);
        // Generate a session ID for this user session
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        setSessionId(sessionId);
        goToStep('spots');
        navigate('/spots');
        // Scroll to top after navigation
        setTimeout(() => scrollToTop(), 100);
      } else {
        setError(`"${inputValue}" is not a recognized city. Please enter a valid city name.`);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to verify city. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (state.error) {
      setError(null);
    }
  };

  return (
    <div className="step-container">
      <ProgressIndicator currentStep="city" />
      
      {state.loading ? (
        <LoadingSpinner 
          type="searching" 
          message={`Verifying ${inputValue}...`} 
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
                placeholder="e.g., Paris, Tokyo, New York"
                disabled={state.loading}
                autoFocus
              />
              {state.error && (
                <div className="error-message">{state.error}</div>
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