import { describe, it, expect, beforeEach, vi } from 'vitest';
import { debounce, throttle, RequestDeduplicator } from '../debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should reset delay on subsequent calls', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    vi.advanceTimersByTime(50);
    
    debouncedFn(); // Reset the timer
    vi.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should execute immediately when immediate is true', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100, true);

    debouncedFn();
    expect(fn).toHaveBeenCalledTimes(1);

    debouncedFn();
    expect(fn).toHaveBeenCalledTimes(1); // Should not call again
  });

  it('should cancel pending execution', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn.cancel();
    
    vi.advanceTimersByTime(100);
    expect(fn).not.toHaveBeenCalled();
  });

  it('should flush pending execution', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn.flush();
    
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments correctly', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn('arg1', 'arg2');
    vi.advanceTimersByTime(100);
    
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should limit function execution rate', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    expect(fn).toHaveBeenCalledTimes(1);

    throttledFn();
    throttledFn();
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should respect leading option', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100, { leading: false });

    throttledFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should respect trailing option', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100, { trailing: false });

    throttledFn();
    expect(fn).toHaveBeenCalledTimes(1);

    throttledFn();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1); // No trailing call
  });
});

describe('RequestDeduplicator', () => {
  beforeEach(() => {
    RequestDeduplicator.clearAll();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should deduplicate identical requests', async () => {
    const requestFn = vi.fn().mockResolvedValue('result');
    
    const promise1 = RequestDeduplicator.deduplicate('key1', requestFn);
    const promise2 = RequestDeduplicator.deduplicate('key1', requestFn);

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(requestFn).toHaveBeenCalledTimes(1);
    expect(result1).toBe('result');
    expect(result2).toBe('result');
  });

  it('should allow different keys to execute separately', async () => {
    const requestFn1 = vi.fn().mockResolvedValue('result1');
    const requestFn2 = vi.fn().mockResolvedValue('result2');
    
    const promise1 = RequestDeduplicator.deduplicate('key1', requestFn1);
    const promise2 = RequestDeduplicator.deduplicate('key2', requestFn2);

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(requestFn1).toHaveBeenCalledTimes(1);
    expect(requestFn2).toHaveBeenCalledTimes(1);
    expect(result1).toBe('result1');
    expect(result2).toBe('result2');
  });

  it('should handle request failures', async () => {
    const error = new Error('Request failed');
    const requestFn = vi.fn().mockRejectedValue(error);
    
    const promise1 = RequestDeduplicator.deduplicate('key1', requestFn);
    const promise2 = RequestDeduplicator.deduplicate('key1', requestFn);

    await expect(promise1).rejects.toThrow('Request failed');
    await expect(promise2).rejects.toThrow('Request failed');
    expect(requestFn).toHaveBeenCalledTimes(1);
  });

  it('should clean up after TTL expires', async () => {
    const requestFn = vi.fn().mockResolvedValue('result');
    
    await RequestDeduplicator.deduplicate('key1', requestFn, 1000);
    
    vi.advanceTimersByTime(1000);
    
    await RequestDeduplicator.deduplicate('key1', requestFn, 1000);
    
    expect(requestFn).toHaveBeenCalledTimes(2);
  });

  it('should track pending request count', () => {
    const requestFn = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
    
    expect(RequestDeduplicator.getPendingCount()).toBe(0);
    
    RequestDeduplicator.deduplicate('key1', requestFn);
    expect(RequestDeduplicator.getPendingCount()).toBe(1);
    
    RequestDeduplicator.deduplicate('key1', requestFn); // Same key, should not increase count
    expect(RequestDeduplicator.getPendingCount()).toBe(1);
    
    RequestDeduplicator.deduplicate('key2', requestFn); // Different key
    expect(RequestDeduplicator.getPendingCount()).toBe(2);
  });

  it('should cancel specific requests', () => {
    const requestFn = vi.fn().mockImplementation(() => new Promise(() => {}));
    
    RequestDeduplicator.deduplicate('key1', requestFn);
    RequestDeduplicator.deduplicate('key2', requestFn);
    
    expect(RequestDeduplicator.getPendingCount()).toBe(2);
    
    RequestDeduplicator.cancel('key1');
    expect(RequestDeduplicator.getPendingCount()).toBe(1);
  });

  it('should clear all pending requests', () => {
    const requestFn = vi.fn().mockImplementation(() => new Promise(() => {}));
    
    RequestDeduplicator.deduplicate('key1', requestFn);
    RequestDeduplicator.deduplicate('key2', requestFn);
    
    expect(RequestDeduplicator.getPendingCount()).toBe(2);
    
    RequestDeduplicator.clearAll();
    expect(RequestDeduplicator.getPendingCount()).toBe(0);
  });
});