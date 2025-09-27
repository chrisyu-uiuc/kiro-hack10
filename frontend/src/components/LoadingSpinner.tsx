

interface LoadingSpinnerProps {
  message?: string;
  type?: 'default' | 'generating' | 'searching' | 'processing' | 'discovering';
}

export function LoadingSpinner({ message = 'Loading...', type = 'default' }: LoadingSpinnerProps) {
  const getLoadingIcon = () => {
    switch (type) {
      case 'generating':
        return (
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>
            <span className="loading-icon-bounce">🎯</span>
            <span className="loading-icon-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
            <span className="loading-icon-bounce" style={{ animationDelay: '0.4s' }}>🗺️</span>
          </div>
        );
      case 'searching':
        return (
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>
            <span className="loading-icon-pulse">🔍</span>
            <span className="loading-icon-float" style={{ animationDelay: '0.3s' }}>📍</span>
          </div>
        );
      case 'processing':
        return (
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>
            <span className="loading-icon-spin">⚙️</span>
            <span className="loading-icon-bounce" style={{ animationDelay: '0.2s' }}>📋</span>
          </div>
        );
      case 'discovering':
        return (
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>
            <span className="loading-icon-bounce">🌟</span>
            <span className="loading-icon-pulse" style={{ animationDelay: '0.3s' }}>🏛️</span>
            <span className="loading-icon-bounce" style={{ animationDelay: '0.6s' }}>🎨</span>
            <span className="loading-icon-pulse" style={{ animationDelay: '0.9s' }}>🍽️</span>
          </div>
        );
      default:
        return <div className="loading" style={{ margin: '0 auto 10px' }}></div>;
    }
  };

  return (
    <div className="loading-container" style={{ textAlign: 'center', padding: '20px' }}>
      {getLoadingIcon()}
      <p className="loading-text" style={{ color: '#666', fontSize: '16px', fontWeight: '500', margin: '10px 0' }}>
        {message}
      </p>
    </div>
  );
}