import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for the SpotInfoPopup component
 * Catches JavaScript errors anywhere in the popup component tree
 */
class SpotInfoErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging
    console.error('SpotInfoPopup Error Boundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    // Reset error state to retry rendering
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div style={errorContainerStyles}>
          <div style={errorContentStyles}>
            <h3 style={errorTitleStyles}>Something went wrong</h3>
            <p style={errorMessageStyles}>
              We encountered an unexpected error while loading the spot information.
            </p>
            <div style={errorActionsStyles}>
              <button
                onClick={this.handleRetry}
                style={retryButtonStyles}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = retryButtonHoverStyles.backgroundColor!;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = retryButtonStyles.backgroundColor!;
                }}
              >
                Try Again
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details style={errorDetailsStyles}>
                <summary style={errorSummaryStyles}>Error Details (Development)</summary>
                <pre style={errorStackStyles}>
                  {this.state.error?.stack || this.state.error?.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Styles for error boundary
const errorContainerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  minHeight: '200px',
};

const errorContentStyles: React.CSSProperties = {
  textAlign: 'center',
  maxWidth: '400px',
};

const errorTitleStyles: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '18px',
  fontWeight: '600',
  marginBottom: '12px',
  margin: '0 0 12px 0',
};

const errorMessageStyles: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
  marginBottom: '20px',
  margin: '0 0 20px 0',
};

const errorActionsStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '12px',
  marginBottom: '20px',
};

const retryButtonStyles: React.CSSProperties = {
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  padding: '10px 20px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  transition: 'background-color 0.2s',
};

const retryButtonHoverStyles: React.CSSProperties = {
  backgroundColor: '#2563eb',
};

const errorDetailsStyles: React.CSSProperties = {
  marginTop: '20px',
  textAlign: 'left',
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '12px',
};

const errorSummaryStyles: React.CSSProperties = {
  cursor: 'pointer',
  fontWeight: '500',
  color: '#374151',
  fontSize: '13px',
};

const errorStackStyles: React.CSSProperties = {
  fontSize: '11px',
  color: '#6b7280',
  marginTop: '8px',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  maxHeight: '200px',
  overflow: 'auto',
};

export default SpotInfoErrorBoundary;