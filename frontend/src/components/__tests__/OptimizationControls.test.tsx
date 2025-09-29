import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OptimizationControls from '../OptimizationControls';
import { ItineraryOptions } from '../../types';

describe('OptimizationControls', () => {
  const defaultOptions: ItineraryOptions = {
    travelMode: 'walking',
    startTime: '09:00',
    visitDuration: 60,
    includeBreaks: true
  };

  const mockOnOptionsChange = vi.fn();
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockOnOptionsChange.mockClear();
    user = userEvent.setup();
  });

  it('renders all control elements', () => {
    render(
      <OptimizationControls 
        options={defaultOptions} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    expect(screen.getByText('🎯 Optimization Settings')).toBeInTheDocument();
    expect(screen.getByText('🚶 Walking')).toBeInTheDocument();
    expect(screen.getByText('🚗 Driving')).toBeInTheDocument();
    expect(screen.getByText('🚌 Transit')).toBeInTheDocument();
    expect(screen.getByLabelText(/Start Time/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Visit Duration/)).toBeInTheDocument();
    expect(screen.getByText('☕ Include meal breaks')).toBeInTheDocument();
  });

  it('shows active travel mode correctly', () => {
    render(
      <OptimizationControls 
        options={{ ...defaultOptions, travelMode: 'driving' }} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    const drivingButton = screen.getByText('🚗 Driving');
    expect(drivingButton).toHaveClass('active');
  });

  it('calls onOptionsChange when travel mode is changed', () => {
    render(
      <OptimizationControls 
        options={defaultOptions} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    const drivingButton = screen.getByText('🚗 Driving');
    fireEvent.click(drivingButton);

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultOptions,
      travelMode: 'driving'
    });
  });

  it('calls onOptionsChange when start time is changed', () => {
    render(
      <OptimizationControls 
        options={defaultOptions} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    const timeInput = screen.getByLabelText(/Start Time/);
    fireEvent.change(timeInput, { target: { value: '10:30' } });

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultOptions,
      startTime: '10:30'
    });
  });

  it('calls onOptionsChange when visit duration is changed', () => {
    render(
      <OptimizationControls 
        options={defaultOptions} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    const durationSlider = screen.getByLabelText(/Visit Duration/);
    fireEvent.change(durationSlider, { target: { value: '90' } });

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultOptions,
      visitDuration: 90
    });
  });

  it('calls onOptionsChange when include breaks is toggled', () => {
    render(
      <OptimizationControls 
        options={defaultOptions} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    const breaksToggle = screen.getByRole('checkbox');
    fireEvent.click(breaksToggle);

    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultOptions,
      includeBreaks: false
    });
  });

  it('disables all controls when disabled prop is true', () => {
    render(
      <OptimizationControls 
        options={defaultOptions} 
        onOptionsChange={mockOnOptionsChange} 
        disabled={true}
      />
    );

    const walkingButton = screen.getByText('🚶 Walking');
    const timeInput = screen.getByLabelText(/Start Time/);
    const durationSlider = screen.getByLabelText(/Visit Duration/);
    const breaksToggle = screen.getByRole('checkbox');

    expect(walkingButton).toBeDisabled();
    expect(timeInput).toBeDisabled();
    expect(durationSlider).toBeDisabled();
    expect(breaksToggle).toBeDisabled();
  });

  it('displays visit duration value correctly', () => {
    render(
      <OptimizationControls 
        options={{ ...defaultOptions, visitDuration: 120 }} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    expect(screen.getByText('⏱️ Visit Duration: 120 minutes')).toBeInTheDocument();
  });

  it('uses default values when options are undefined', () => {
    const optionsWithUndefined: ItineraryOptions = {};
    
    render(
      <OptimizationControls 
        options={optionsWithUndefined} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    const timeInput = screen.getByLabelText(/Start Time/) as HTMLInputElement;
    const durationSlider = screen.getByLabelText(/Visit Duration/) as HTMLInputElement;
    const breaksToggle = screen.getByRole('checkbox') as HTMLInputElement;

    expect(timeInput.value).toBe('09:00');
    expect(durationSlider.value).toBe('60');
    expect(breaksToggle.checked).toBe(true);
  });

  it('handles rapid option changes without losing state', async () => {
    render(
      <OptimizationControls 
        options={defaultOptions} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    const drivingButton = screen.getByText('🚗 Driving');
    const transitButton = screen.getByText('🚌 Transit');
    
    // Rapid clicks
    await user.click(drivingButton);
    await user.click(transitButton);
    
    expect(mockOnOptionsChange).toHaveBeenCalledTimes(2);
    expect(mockOnOptionsChange).toHaveBeenLastCalledWith({
      ...defaultOptions,
      travelMode: 'transit'
    });
  });

  it('validates time input format', async () => {
    render(
      <OptimizationControls 
        options={defaultOptions} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    const timeInput = screen.getByLabelText(/Start Time/);
    
    // Valid time format - use fireEvent.change for more predictable behavior
    fireEvent.change(timeInput, { target: { value: '14:30' } });
    
    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultOptions,
      startTime: '14:30'
    });
  });

  it('handles edge cases for visit duration slider', async () => {
    render(
      <OptimizationControls 
        options={defaultOptions} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    const durationSlider = screen.getByLabelText(/Visit Duration/);
    
    // Test minimum value
    fireEvent.change(durationSlider, { target: { value: '30' } });
    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultOptions,
      visitDuration: 30
    });

    // Test maximum value
    fireEvent.change(durationSlider, { target: { value: '180' } });
    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultOptions,
      visitDuration: 180
    });
  });

  it('maintains accessibility attributes', () => {
    render(
      <OptimizationControls 
        options={defaultOptions} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    // Check ARIA labels and roles
    expect(screen.getByLabelText(/Start Time/)).toHaveAttribute('type', 'time');
    expect(screen.getByLabelText(/Visit Duration/)).toHaveAttribute('type', 'range');
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    
    // Check button accessibility
    const travelModeButtons = screen.getAllByRole('button');
    travelModeButtons.forEach(button => {
      expect(button).toHaveAttribute('type', 'button');
    });
  });

  it('shows correct visual feedback for active travel mode', () => {
    const { rerender } = render(
      <OptimizationControls 
        options={{ ...defaultOptions, travelMode: 'walking' }} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    expect(screen.getByText('🚶 Walking')).toHaveClass('active');
    expect(screen.getByText('🚗 Driving')).not.toHaveClass('active');
    expect(screen.getByText('🚌 Transit')).not.toHaveClass('active');

    // Test mode change
    rerender(
      <OptimizationControls 
        options={{ ...defaultOptions, travelMode: 'driving' }} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    expect(screen.getByText('🚶 Walking')).not.toHaveClass('active');
    expect(screen.getByText('🚗 Driving')).toHaveClass('active');
    expect(screen.getByText('🚌 Transit')).not.toHaveClass('active');
  });

  it('handles keyboard navigation for travel mode buttons', async () => {
    render(
      <OptimizationControls 
        options={defaultOptions} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    const walkingButton = screen.getByText('🚶 Walking');
    const drivingButton = screen.getByText('🚗 Driving');

    // Focus and activate with keyboard
    walkingButton.focus();
    await user.keyboard('{Tab}');
    expect(drivingButton).toHaveFocus();
    
    await user.keyboard('{Enter}');
    expect(mockOnOptionsChange).toHaveBeenCalledWith({
      ...defaultOptions,
      travelMode: 'driving'
    });
  });

  it('displays duration value updates in real-time', () => {
    const { rerender } = render(
      <OptimizationControls 
        options={{ ...defaultOptions, visitDuration: 90 }} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    expect(screen.getByText('⏱️ Visit Duration: 90 minutes')).toBeInTheDocument();

    rerender(
      <OptimizationControls 
        options={{ ...defaultOptions, visitDuration: 120 }} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    expect(screen.getByText('⏱️ Visit Duration: 120 minutes')).toBeInTheDocument();
  });

  it('handles component unmounting gracefully', () => {
    const { unmount } = render(
      <OptimizationControls 
        options={defaultOptions} 
        onOptionsChange={mockOnOptionsChange} 
      />
    );

    expect(() => unmount()).not.toThrow();
  });
});