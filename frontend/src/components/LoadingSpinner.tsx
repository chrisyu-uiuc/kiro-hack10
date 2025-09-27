

interface LoadingSpinnerProps {
  message?: string;
  type?: 'default' | 'generating' | 'searching' | 'processing' | 'discovering';
}

export function LoadingSpinner({ message = 'Loading...', type = 'default' }: LoadingSpinnerProps) {
  const getLoadingIcon = () => {
    switch (type) {
      case 'generating':
        return (
          <>
            <div className="loading-spinner"></div>
            <div style={{ fontSize: '32px', marginBottom: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <span className="loading-icon-bounce">🎯</span>
              <span className="loading-icon-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
              <span className="loading-icon-bounce" style={{ animationDelay: '0.4s' }}>🗺️</span>
            </div>
            <div className="loading-dots">
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
            </div>
          </>
        );
      case 'searching':
        return (
          <>
            <div className="loading-spinner"></div>
            <div style={{ fontSize: '32px', marginBottom: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <span className="loading-icon-pulse">🔍</span>
              <span className="loading-icon-float" style={{ animationDelay: '0.3s' }}>📍</span>
            </div>
            <div className="loading-dots">
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
            </div>
          </>
        );
      case 'processing':
        return (
          <>
            <div className="loading-spinner"></div>
            <div style={{ fontSize: '32px', marginBottom: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <span className="loading-icon-spin">⚙️</span>
              <span className="loading-icon-bounce" style={{ animationDelay: '0.2s' }}>📋</span>
            </div>
            <div className="loading-dots">
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
            </div>
          </>
        );
      case 'discovering':
        return (
          <>
            <div className="loading-spinner"></div>
            <div style={{ fontSize: '32px', marginBottom: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <span className="loading-icon-bounce">🌟</span>
              <span className="loading-icon-pulse" style={{ animationDelay: '0.3s' }}>🏛️</span>
              <span className="loading-icon-bounce" style={{ animationDelay: '0.6s' }}>🎨</span>
              <span className="loading-icon-pulse" style={{ animationDelay: '0.9s' }}>🍽️</span>
            </div>
            <div className="loading-dots">
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
            </div>
          </>
        );
      default:
        return (
          <>
            <div className="loading-spinner"></div>
            <div className="loading-dots">
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
              <div className="loading-dot"></div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="loading-container">
      {getLoadingIcon()}
      <p className="loading-text" style={{ 
        color: 'var(--gray-600)', 
        fontSize: 'var(--text-lg)', 
        fontWeight: '500', 
        margin: '20px 0 0 0',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        {message}
      </p>
    </div>
  );
}