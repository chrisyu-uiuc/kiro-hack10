import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="container">
          <div className="step-container">
            <h2>🚨 Something went wrong</h2>
            <p>We're sorry, but something unexpected happened.</p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginTop: '20px' }}>
                <summary>Error details (development only)</summary>
                <pre style={{ 
                  background: '#f5f5f5', 
                  padding: '10px', 
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px'
                }}>
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <button 
              className="btn-primary"
              onClick={() => window.location.reload()}
              style={{ marginTop: '20px' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}