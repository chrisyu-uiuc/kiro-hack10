import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpotInfoErrorBoundary from '../SpotInfoErrorBoundary';

// Mock console.error to avoid noise in tests
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error for error boundary');
  }
  return <div>Normal component</div>;
};

describe('SpotInfoErrorBoundary', () => {
  beforeEach(() => {
    mockConsoleError.mockClear();
  });

  it('should render children when there is no error', () => {
    render(
      <SpotInfoErrorBoundary>
        <div>Test content</div>
      </SpotInfoErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render default error UI when child component throws', () => {
    render(
      <SpotInfoErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SpotInfoErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <SpotInfoErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </SpotInfoErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const mockOnError = vi.fn();

    render(
      <SpotInfoErrorBoundary onError={mockOnError}>
        <ThrowError shouldThrow={true} />
      </SpotInfoErrorBoundary>
    );

    expect(mockOnError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should reset error state when retry button is clicked', () => {
    // Create a component that can change its behavior
    let shouldThrow = true;
    const DynamicComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error for error boundary');
      }
      return <div>Normal component</div>;
    };

    render(
      <SpotInfoErrorBoundary>
        <DynamicComponent />
      </SpotInfoErrorBoundary>
    );

    // Error UI should be visible
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Change the component behavior and click retry
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    // After retry, the component should render normally
    expect(screen.getByText('Normal component')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should log error to console', () => {
    render(
      <SpotInfoErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SpotInfoErrorBoundary>
    );

    expect(mockConsoleError).toHaveBeenCalledWith(
      'SpotInfoPopup Error Boundary caught an error:',
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should show error details in development mode', () => {
    // Mock NODE_ENV for this test
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <SpotInfoErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SpotInfoErrorBoundary>
    );

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  it('should not show error details in production mode', () => {
    // Mock NODE_ENV for this test
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    render(
      <SpotInfoErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SpotInfoErrorBoundary>
    );

    expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });

  it('should handle retry button hover effects', () => {
    render(
      <SpotInfoErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SpotInfoErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: 'Try Again' });
    
    // Test hover effects
    fireEvent.mouseEnter(retryButton);
    expect(retryButton.style.backgroundColor).toBe('rgb(37, 99, 235)'); // #2563eb

    fireEvent.mouseLeave(retryButton);
    expect(retryButton.style.backgroundColor).toBe('rgb(59, 130, 246)'); // #3b82f6
  });

  it('should maintain error state across re-renders until retry', () => {
    const { rerender } = render(
      <SpotInfoErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SpotInfoErrorBoundary>
    );

    // Error UI should be visible
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Re-render with same throwing component
    rerender(
      <SpotInfoErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SpotInfoErrorBoundary>
    );

    // Error UI should still be visible
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Re-render with non-throwing component (but error state should persist)
    rerender(
      <SpotInfoErrorBoundary>
        <ThrowError shouldThrow={false} />
      </SpotInfoErrorBoundary>
    );

    // Error UI should still be visible until retry is clicked
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should handle error boundary retry functionality', () => {
    // Test basic retry functionality - the error boundary resets state
    render(
      <SpotInfoErrorBoundary>
        <ThrowError shouldThrow={true} />
      </SpotInfoErrorBoundary>
    );

    // Error UI should be visible
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click retry button - this resets the error state
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    // The error boundary has reset its state, but the component will throw again
    // This is expected behavior - the error boundary provides the retry mechanism
    // but the actual fix needs to come from the component itself
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});