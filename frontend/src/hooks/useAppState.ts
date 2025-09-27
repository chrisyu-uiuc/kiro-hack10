import { useState, useCallback } from 'react';
import { AppState, Spot, Itinerary } from '../types';

const initialState: AppState = {
  currentStep: 'city',
  city: '',
  sessionId: '',
  spots: [],
  selectedSpotIds: [],
  itinerary: null,
  loading: false,
  error: null,
  noMoreSpots: false,
};

export function useAppState() {
  const [state, setState] = useState<AppState>(initialState);

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    updateState({ loading, error: null });
  }, [updateState]);

  const setError = useCallback((error: string | null) => {
    updateState({ error, loading: false });
  }, [updateState]);

  const setCity = useCallback((city: string) => {
    updateState({ city });
  }, [updateState]);

  const setSessionId = useCallback((sessionId: string) => {
    updateState({ sessionId });
  }, [updateState]);

  const setSpots = useCallback((spots: Spot[]) => {
    updateState({ spots, selectedSpotIds: [], noMoreSpots: false });
  }, [updateState]);

  const addMoreSpots = useCallback((newSpots: Spot[], noMoreSpots?: boolean) => {
    console.log(`🔍 Adding ${newSpots.length} spots, noMoreSpots: ${noMoreSpots}`);
    setState(prev => ({
      ...prev,
      spots: [...prev.spots, ...newSpots],
      noMoreSpots: noMoreSpots || prev.noMoreSpots
    }));
  }, []);

  const toggleSpotSelection = useCallback((spotId: string) => {
    setState(prev => {
      const isSelected = prev.selectedSpotIds.includes(spotId);
      const selectedSpotIds = isSelected
        ? prev.selectedSpotIds.filter(id => id !== spotId)
        : [...prev.selectedSpotIds, spotId];
      
      return { ...prev, selectedSpotIds };
    });
  }, []);

  const setItinerary = useCallback((itinerary: Itinerary) => {
    updateState({ itinerary });
  }, [updateState]);

  const goToStep = useCallback((step: AppState['currentStep']) => {
    updateState({ currentStep: step, error: null });
  }, [updateState]);

  const resetState = useCallback(() => {
    setState(initialState);
  }, []);

  const getSelectedSpots = useCallback(() => {
    return state.spots.filter(spot => state.selectedSpotIds.includes(spot.id));
  }, [state.spots, state.selectedSpotIds]);

  return {
    state,
    updateState,
    setLoading,
    setError,
    setCity,
    setSessionId,
    setSpots,
    addMoreSpots,
    toggleSpotSelection,
    setItinerary,
    goToStep,
    resetState,
    getSelectedSpots,
  };
}