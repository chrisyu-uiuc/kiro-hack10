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
    // Ensure we don't exceed 40 spots even on initial load
    const limitedSpots = spots.slice(0, 40);
    console.log(`🔍 Setting ${limitedSpots.length} spots (limited from ${spots.length})`);
    updateState({ 
      spots: limitedSpots, 
      selectedSpotIds: [], 
      noMoreSpots: limitedSpots.length >= 40 
    });
  }, [updateState]);

  const addMoreSpots = useCallback((newSpots: Spot[], noMoreSpots?: boolean) => {
    console.log(`🔍 Adding ${newSpots.length} spots, noMoreSpots: ${noMoreSpots}`);
    setState(prev => {
      // Check if we're already at the 40-spot limit
      if (prev.spots.length >= 40) {
        console.log(`🚫 Already at maximum of 40 spots, not adding more`);
        return {
          ...prev,
          noMoreSpots: true
        };
      }
      
      // Get existing spot IDs to check for duplicates
      const existingSpotIds = new Set(prev.spots.map(spot => spot.id));
      
      // Filter out duplicates and limit to remaining slots
      const remainingSlots = 40 - prev.spots.length;
      const uniqueNewSpots = newSpots
        .filter(spot => !existingSpotIds.has(spot.id))
        .slice(0, remainingSlots);
      
      console.log(`🔍 Filtered ${newSpots.length} new spots to ${uniqueNewSpots.length} unique spots (${remainingSlots} slots remaining)`);
      
      // If no unique spots to add, mark as no more spots
      if (uniqueNewSpots.length === 0) {
        console.log(`🚫 No unique spots to add, marking noMoreSpots as true`);
        return {
          ...prev,
          noMoreSpots: true
        };
      }
      
      const allSpots = [...prev.spots, ...uniqueNewSpots];
      const validSpotIds = allSpots.map(spot => spot.id);
      
      // Filter out any selected IDs that don't exist in the current spots
      const validSelectedSpotIds = prev.selectedSpotIds.filter(id => validSpotIds.includes(id));
      
      console.log(`🔍 Added ${uniqueNewSpots.length} unique spots. Total: ${allSpots.length}/40`);
      
      return {
        ...prev,
        spots: allSpots,
        selectedSpotIds: validSelectedSpotIds,
        noMoreSpots: noMoreSpots || allSpots.length >= 40
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