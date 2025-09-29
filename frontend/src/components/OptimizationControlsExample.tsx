import { useState } from 'react';
import OptimizationControls from './OptimizationControls';
import { ItineraryOptions } from '../types';

/**
 * Example component showing how to use OptimizationControls
 * This demonstrates the integration pattern for the itinerary optimization feature
 */
function OptimizationControlsExample() {
  const [options, setOptions] = useState<ItineraryOptions>({
    travelMode: 'walking',
    startTime: '09:00',
    visitDuration: 60,
    includeBreaks: true
  });

  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptionsChange = (newOptions: ItineraryOptions) => {
    setOptions(newOptions);
    console.log('Optimization options updated:', newOptions);
  };

  const handleOptimizeItinerary = async () => {
    setIsOptimizing(true);
    
    // Simulate API call to optimize itinerary
    console.log('Optimizing itinerary with options:', options);
    
    // In real implementation, this would call:
    // const result = await ApiService.generateOptimizedItinerary(sessionId, options);
    
    setTimeout(() => {
      setIsOptimizing(false);
      console.log('Optimization complete!');
    }, 2000);
  };

  return (
    <div className="step-container">
      <h2>🎯 Itinerary Optimization</h2>
      <p>Configure your preferences and optimize your travel route for the best experience.</p>

      <OptimizationControls
        options={options}
        onOptionsChange={handleOptionsChange}
        disabled={isOptimizing}
      />

      <div className="navigation-buttons">
        <button
          type="button"
          className="btn-secondary"
          disabled={isOptimizing}
        >
          ← Back to Basic Itinerary
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleOptimizeItinerary}
          disabled={isOptimizing}
        >
          {isOptimizing ? '🔄 Optimizing...' : '🚀 Optimize Itinerary'}
        </button>
      </div>

      {/* Current Options Display */}
      <div className="options-preview">
        <h4>Current Settings:</h4>
        <ul>
          <li><strong>Travel Mode:</strong> {options.travelMode}</li>
          <li><strong>Start Time:</strong> {options.startTime}</li>
          <li><strong>Visit Duration:</strong> {options.visitDuration} minutes</li>
          <li><strong>Include Breaks:</strong> {options.includeBreaks ? 'Yes' : 'No'}</li>
        </ul>
      </div>
    </div>
  );
}

export default OptimizationControlsExample;