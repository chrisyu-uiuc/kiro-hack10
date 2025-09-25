

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <div className="loading" style={{ margin: '0 auto 10px' }}></div>
      <p>{message}</p>
    </div>
  );
}