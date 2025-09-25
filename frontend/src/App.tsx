
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppState } from './hooks/useAppState';
import CityInput from './components/CityInput';
import SpotSelection from './components/SpotSelection';
import ItineraryDisplay from './components/ItineraryDisplay';

function App() {
  const appState = useAppState();

  return (
    <ErrorBoundary>
      <div className="container">
        <header style={{ marginBottom: '30px' }}>
          <h1>🌍 Travel Itinerary Generator</h1>
          <p>Create your perfect travel plan with AI-powered recommendations</p>
        </header>

        <Routes>
          <Route 
            path="/" 
            element={<CityInput {...appState} />} 
          />
          <Route 
            path="/spots" 
            element={
              appState.state.city && appState.state.sessionId ? (
                <SpotSelection {...appState} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          <Route 
            path="/itinerary" 
            element={
              appState.state.itinerary ? (
                <ItineraryDisplay {...appState} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;