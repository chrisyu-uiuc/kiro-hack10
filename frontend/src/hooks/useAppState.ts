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
  loadingMore: false,
  loadingItinerary: false,
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

  const setLoadingMore = useCallback((loadingMore: boolean) => {
    updateState({ loadingMore });
  }, [updateState]);

  const setLoadingItinerary = useCallback((loadingItinerary: boolean) => {
    updateState({ loadingItinerary });
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
    setState(prev => {
      const allSpots = [...prev.spots, ...newSpots];
      const validSpotIds = allSpots.map(spot => spot.id);
      
      // Filter out any selected IDs that don't exist in the current spots
      const validSelectedSpotIds = prev.selectedSpotIds.filter(id => validSpotIds.includes(id));
      
      console.log(`🔍 Filtered selectedSpotIds from ${prev.selectedSpotIds.length} to ${validSelectedSpotIds.length}`);
      
      return {
        ...prev,
        spots: allSpots,
        selectedSpotIds: validSelectedSpotIds,
        noMoreSpots: noMoreSpots || prev.noMoreSpots
      };
    });
  }, []);

  const toggleSpotSelection = useCallback((spotId: string) => {
    setState(prev => {
      // Ensure the spot exists in our current spots array
      const spotExists = prev.spots.some(spot => spot.id === spotId);
      if (!spotExists) {
        console.warn(`🚫 Attempted to select non-existent spot: ${spotId}`);
        return prev;
      }
      
      const isSelected = prev.selectedSpotIds.includes(spotId);
      const selectedSpotIds = isSelected
        ? prev.selectedSpotIds.filter(id => id !== spotId)
        : [...prev.selectedSpotIds, spotId];
      
      console.log(`🔍 Toggled spot ${spotId}: ${isSelected ? 'deselected' : 'selected'}`);
      
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

  const cleanupSelectedSpotIds = useCallback(() => {
    setState(prev => {
      const validSpotIds = prev.spots.map(spot => spot.id);
      const validSelectedSpotIds = prev.selectedSpotIds.filter(id => validSpotIds.includes(id));
      
      if (validSelectedSpotIds.length !== prev.selectedSpotIds.length) {
        console.log(`🧹 Cleaned up selectedSpotIds: ${prev.selectedSpotIds.length} -> ${validSelectedSpotIds.length}`);
        return { ...prev, selectedSpotIds: validSelectedSpotIds };
      }
      
      return prev;
    });
  }, []);

  return {
    state,
    updateState,
    setLoading,
    setLoadingMore,
    setLoadingItinerary,
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
    cleanupSelectedSpotIds,
  };
}