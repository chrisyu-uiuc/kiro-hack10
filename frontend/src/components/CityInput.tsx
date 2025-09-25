import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';
import { ApiService } from '../services/api';
import { useAppState } from '../hooks/useAppState';

interface CityInputProps extends ReturnType<typeof useAppState> {}

function CityInput({ 
  state, 
  setLoading, 
  setError, 
  setCity, 
  setSessionId,
  goToStep 
}: CityInputProps) {
  const [inputValue, setInputValue] = useState(state.city);
  const navigate = useNavigate();

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
        setCity(result.city);
        // Generate a session ID for this user session
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setSessionId(sessionId);
        goToStep('spots');
        navigate('/spots');
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

  if (state.loading) {
    return (
      <div className="step-container">
        <LoadingSpinner message="Verifying city..." />
      </div>
    );
  }

  return (
    <div className="step-container">
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
    </div>
  );
}

export default CityInput;