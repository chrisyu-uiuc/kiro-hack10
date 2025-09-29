import { TravelMode, ItineraryOptions } from '../types';

interface OptimizationControlsProps {
  options: ItineraryOptions;
  onOptionsChange: (options: ItineraryOptions) => void;
  disabled?: boolean;
}

function OptimizationControls({ options, onOptionsChange, disabled = false }: OptimizationControlsProps) {
  const handleTravelModeChange = (mode: TravelMode) => {
    onOptionsChange({ ...options, travelMode: mode });
  };

  const handleStartTimeChange = (time: string) => {
    onOptionsChange({ ...options, startTime: time });
  };

  const handleVisitDurationChange = (duration: number) => {
    onOptionsChange({ ...options, visitDuration: duration });
  };

  const handleIncludeBreaksChange = (includeBreaks: boolean) => {
    onOptionsChange({ ...options, includeBreaks });
  };

  return (
    <div className="optimization-controls">
      <h3>🎯 Optimization Settings</h3>
      <p>Customize your itinerary preferences for the best travel experience.</p>

      <div className="controls-grid">
        {/* Travel Mode Selector */}
        <div className="control-group">
          <label className="control-label">
            🚶 Travel Mode
          </label>
          <div className="travel-mode-selector">
            <button
              type="button"
              className={`travel-mode-btn ${options.travelMode === 'walking' ? 'active' : ''}`}
              onClick={() => handleTravelModeChange('walking')}
              disabled={disabled}
            >
              🚶 Walking
            </button>
            <button
              type="button"
              className={`travel-mode-btn ${options.travelMode === 'driving' ? 'active' : ''}`}
              onClick={() => handleTravelModeChange('driving')}
              disabled={disabled}
            >
              🚗 Driving
            </button>
            <button
              type="button"
              className={`travel-mode-btn ${options.travelMode === 'transit' ? 'active' : ''}`}
              onClick={() => handleTravelModeChange('transit')}
              disabled={disabled}
            >
              🚌 Transit
            </button>
          </div>
        </div>

        {/* Start Time Picker */}
        <div className="control-group">
          <label htmlFor="start-time" className="control-label">
            ⏰ Start Time
          </label>
          <input
            id="start-time"
            type="time"
            value={options.startTime || '09:00'}
            onChange={(e) => handleStartTimeChange(e.target.value)}
            disabled={disabled}
            className="time-input"
          />
        </div>

        {/* Visit Duration Slider */}
        <div className="control-group">
          <label htmlFor="visit-duration" className="control-label">
            ⏱️ Visit Duration: {options.visitDuration || 60} minutes
          </label>
          <input
            id="visit-duration"
            type="range"
            min="30"
            max="180"
            step="15"
            value={options.visitDuration || 60}
            onChange={(e) => handleVisitDurationChange(parseInt(e.target.value))}
            disabled={disabled}
            className="duration-slider"
          />
          <div className="slider-labels">
            <span>30 min</span>
            <span>1 hr</span>
            <span>1.5 hr</span>
            <span>2 hr</span>
            <span>3 hr</span>
          </div>
        </div>

        {/* Include Breaks Toggle */}
        <div className="control-group">
          <label className="control-label toggle-label">
            <input
              type="checkbox"
              checked={options.includeBreaks !== false}
              onChange={(e) => handleIncludeBreaksChange(e.target.checked)}
              disabled={disabled}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">
              ☕ Include meal breaks
            </span>
          </label>
          <p className="control-description">
            Automatically add lunch and dinner breaks to your itinerary
          </p>
        </div>
      </div>
    </div>
  );
}

export default OptimizationControls;