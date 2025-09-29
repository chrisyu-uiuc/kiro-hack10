
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppState } from './hooks/useAppState';
import CityInput from './components/CityInput';
import SpotSelection from './components/SpotSelection';
import ItineraryDisplay from './components/ItineraryDisplay';
import FloatingElements from './components/FloatingElements';
import SmallHeader from './components/SmallHeader';

function App() {
  const appState = useAppState();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <ErrorBoundary>
      <FloatingElements />
      <div className="container">
        {isHomePage ? (
          <div className="main-header">
            <h1>✈️ Your AI Trip Planner</h1>
            <p>Discover. Plan. Explore. Your AI-powered travel companion.</p>
          </div>
        ) : (
          <SmallHeader />
        )}

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
              appState.state.city && appState.state.sessionId && appState.state.selectedSpotIds.length > 0 ? (
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