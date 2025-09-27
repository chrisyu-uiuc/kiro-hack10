import { useEffect } from 'react';

/**
 * Custom hook to scroll to top when component mounts
 * @param behavior - scroll behavior ('smooth' | 'instant' | 'auto')
 */
export function useScrollToTop(behavior: ScrollBehavior = 'smooth') {
  useEffect(() => {
    window.scrollTo({ 
      top: 0, 
      behavior 
    });
  }, [behavior]);
}

/**
 * Utility function to scroll to top programmatically
 * @param behavior - scroll behavior ('smooth' | 'instant' | 'auto')
 */
export function scrollToTop(behavior: ScrollBehavior = 'smooth') {
  window.scrollTo({ 
    top: 0, 
    behavior 
  });
}