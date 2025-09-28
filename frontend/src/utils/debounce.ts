/**
 * Debouncing utilities for performance optimization
 */

export type DebouncedFunction<T extends (...args: any[]) => any> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
};

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): DebouncedFunction<T> {
  let timeout: NodeJS.Timeout | null = null;
  let args: Parameters<T> | null = null;
  let context: any = null;
  let result: ReturnType<T>;

  const later = () => {
    timeout = null;
    if (!immediate && args) {
      result = func.apply(context, args);
      context = args = null;
    }
  };

  const debounced = function (this: any, ...newArgs: Parameters<T>) {
    context = this;
    args = newArgs;

    const callNow = immediate && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);

    if (callNow) {
      result = func.apply(context, args);
      context = args = null;
    }
  } as DebouncedFunction<T>;

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    context = args = null;
  };

  debounced.flush = () => {
    if (timeout && args) {
      result = func.apply(context, args);
      debounced.cancel();
    }
  };

  return debounced;
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): DebouncedFunction<T> {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;
  let args: Parameters<T> | null = null;
  let context: any = null;
  let result: ReturnType<T>;

  const { leading = true, trailing = true } = options;

  const later = () => {
    previous = leading === false ? 0 : Date.now();
    timeout = null;
    if (args) {
      result = func.apply(context, args);
      context = args = null;
    }
  };

  const throttled = function (this: any, ...newArgs: Parameters<T>) {
    const now = Date.now();
    if (!previous && leading === false) previous = now;

    const remaining = wait - (now - previous);
    context = this;
    args = newArgs;

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(context, args);
      context = args = null;
    } else if (!timeout && trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
  } as DebouncedFunction<T>;

  throttled.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    previous = 0;
    context = args = null;
  };

  throttled.flush = () => {
    if (timeout && args) {
      result = func.apply(context, args);
      throttled.cancel();
    }
  };

  return throttled;
}

/**
 * Request deduplication utility to prevent multiple identical API calls
 */
export class RequestDeduplicator {
  private static pendingRequests = new Map<string, Promise<any>>();

  /**
   * Deduplicate requests by key. If a request with the same key is already pending,
   * return the existing promise instead of making a new request.
   */
  static async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = 5000
  ): Promise<T> {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Clean up after request completes
      this.pendingRequests.delete(key);
    });

    // Store pending request
    this.pendingRequests.set(key, promise);

    // Set TTL cleanup
    setTimeout(() => {
      this.pendingRequests.delete(key);
    }, ttl);

    return promise;
  }

  /**
   * Cancel a pending request
   */
  static cancel(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Clear all pending requests
   */
  static clearAll(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get count of pending requests
   */
  static getPendingCount(): number {
    return this.pendingRequests.size;
  }
}