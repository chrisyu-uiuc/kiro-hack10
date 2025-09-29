# OptimizationControls Component

## Overview

The `OptimizationControls` component provides a user interface for configuring itinerary optimization settings. It allows users to customize their travel preferences before generating an optimized itinerary using Google Maps APIs.

## Features

- **Travel Mode Selection**: Choose between walking, driving, or public transit
- **Start Time Picker**: Set the preferred start time for the itinerary
- **Visit Duration Slider**: Adjust how long to spend at each location (30 minutes to 3 hours)
- **Meal Breaks Toggle**: Enable/disable automatic meal break insertion

## Props

```typescript
interface OptimizationControlsProps {
  options: ItineraryOptions;
  onOptionsChange: (options: ItineraryOptions) => void;
  disabled?: boolean;
}
```

### ItineraryOptions Type

```typescript
interface ItineraryOptions {
  travelMode?: TravelMode; // 'walking' | 'driving' | 'transit'
  startTime?: string; // HH:MM format (e.g., "09:00")
  visitDuration?: number; // minutes per spot (30-180)
  includeBreaks?: boolean; // whether to include meal breaks
}
```

## Usage Example

```tsx
import OptimizationControls from './OptimizationControls';
import { ItineraryOptions } from '../types';

function MyComponent() {
  const [options, setOptions] = useState<ItineraryOptions>({
    travelMode: 'walking',
    startTime: '09:00',
    visitDuration: 60,
    includeBreaks: true
  });

  const handleOptionsChange = (newOptions: ItineraryOptions) => {
    setOptions(newOptions);
    // Optionally trigger itinerary regeneration
  };

  return (
    <OptimizationControls
      options={options}
      onOptionsChange={handleOptionsChange}
      disabled={false}
    />
  );
}
```

## Integration with ItineraryDisplay

To integrate with the existing `ItineraryDisplay` component:

1. **Add state for optimization options**:
```tsx
const [optimizationOptions, setOptimizationOptions] = useState<ItineraryOptions>({
  travelMode: 'walking',
  startTime: '09:00',
  visitDuration: 60,
  includeBreaks: true
});
```

2. **Add the controls before the itinerary display**:
```tsx
return (
  <div className="step-container">
    <ProgressIndicator currentStep="itinerary" />
    
    {/* Add optimization controls */}
    <OptimizationControls
      options={optimizationOptions}
      onOptionsChange={setOptimizationOptions}
      disabled={state.loading}
    />
    
    {/* Existing itinerary display */}
    <h2>🗓️ {state.itinerary.title}</h2>
    {/* ... rest of component */}
  </div>
);
```

3. **Add optimization button**:
```tsx
<div className="navigation-buttons">
  <button
    type="button"
    className="btn-secondary"
    onClick={handleStartOver}
  >
    🌍 Plan Another Trip
  </button>
  <button
    type="button"
    className="btn-primary"
    onClick={() => generateOptimizedItinerary(optimizationOptions)}
    disabled={state.loading}
  >
    🚀 Optimize Route
  </button>
</div>
```

## Styling

The component uses CSS classes that follow the existing design system:

- `.optimization-controls` - Main container
- `.controls-grid` - Responsive grid layout
- `.control-group` - Individual control sections
- `.travel-mode-selector` - Travel mode buttons
- `.time-input` - Time picker styling
- `.duration-slider` - Range slider styling
- `.toggle-label` - Toggle switch styling

All styles are responsive and follow the application's design tokens for colors, spacing, and typography.

## Accessibility

- All form controls have proper labels
- Keyboard navigation is supported
- Focus states are clearly visible
- Screen reader friendly markup
- Disabled states are properly handled

## Testing

The component includes comprehensive tests covering:

- Rendering of all control elements
- User interactions (clicks, changes)
- Prop updates and callbacks
- Disabled state behavior
- Default value handling

Run tests with:
```bash
npm test -- OptimizationControls.test.tsx
```

## Requirements Fulfilled

This component fulfills the following requirements from the specification:

- **Travel Mode Support**: Allows selection between walking, driving, and transit modes
- **User Experience**: Provides intuitive controls for customizing itinerary preferences
- **Real-time Updates**: Changes are immediately reflected and can trigger re-optimization
- **Responsive Design**: Works on both desktop and mobile devices