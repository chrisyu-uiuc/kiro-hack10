import React from 'react';

interface ProgressIndicatorProps {
  currentStep: 'city' | 'spots' | 'itinerary';
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep }) => {
  const steps = [
    { key: 'city', label: 'Choose City' },
    { key: 'spots', label: 'Select Spots' },
    { key: 'itinerary', label: 'Your Itinerary' }
  ];

  const getStepClass = (stepKey: string) => {
    if (stepKey === currentStep) return 'progress-step active';
    
    const currentIndex = steps.findIndex(s => s.key === currentStep);
    const stepIndex = steps.findIndex(s => s.key === stepKey);
    
    if (stepIndex < currentIndex) return 'progress-step completed';
    return 'progress-step';
  };

  return (
    <div className="progress-indicator">
      {steps.map((step, index) => (
        <React.Fragment key={step.key}>
          <div 
            className={getStepClass(step.key)}
            title={step.label}
          />
          {index < steps.length - 1 && (
            <div 
              className="progress-connector"
              style={{
                width: '40px',
                height: '2px',
                background: steps.findIndex(s => s.key === currentStep) > index 
                  ? 'var(--success-500)' 
                  : 'var(--gray-300)',
                transition: 'background 0.3s ease'
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ProgressIndicator;