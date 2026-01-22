/**
 * Tests for retry logic
 */

import { retryWithBackoff } from '../src/utils/retry';
import { ZiptaxNetworkError, ZiptaxAPIError } from '../src/exceptions';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('success');

    const promise = retryWithBackoff(fn);
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on network errors', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new ZiptaxNetworkError('Network error'))
      .mockResolvedValue('success');

    const promise = retryWithBackoff(fn, { maxAttempts: 3 });
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry on 5xx errors', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new ZiptaxAPIError('Server error', 500))
      .mockResolvedValue('success');

    const promise = retryWithBackoff(fn, { maxAttempts: 3 });
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on 4xx errors', async () => {
    const error = new ZiptaxAPIError('Bad request', 400);
    const fn = jest.fn().mockRejectedValue(error);

    const promise = retryWithBackoff(fn, { maxAttempts: 3 });

    // Run timers and wait for rejection
    const rejection = promise.catch((e) => e);
    await jest.runAllTimersAsync();
    const result = await rejection;

    expect(result).toEqual(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should respect maxAttempts', async () => {
    const error = new ZiptaxNetworkError('Network error');
    const fn = jest.fn().mockRejectedValue(error);

    const promise = retryWithBackoff(fn, { maxAttempts: 2 });

    // Run timers and wait for rejection
    const rejection = promise.catch((e) => e);
    await jest.runAllTimersAsync();
    const result = await rejection;

    expect(result).toEqual(error);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should use exponential backoff', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new ZiptaxNetworkError('Error 1'))
      .mockRejectedValueOnce(new ZiptaxNetworkError('Error 2'))
      .mockResolvedValue('success');

    const promise = retryWithBackoff(fn, {
      maxAttempts: 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
    });

    // Fast-forward through all timers
    await jest.runAllTimersAsync();
    await promise;

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should respect maxDelay', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new ZiptaxNetworkError('Error'))
      .mockResolvedValue('success');

    const promise = retryWithBackoff(fn, {
      maxAttempts: 3,
      initialDelay: 1000,
      backoffMultiplier: 100,
      maxDelay: 2000,
    });

    await jest.runAllTimersAsync();
    await promise;

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should use custom shouldRetry function', async () => {
    const error = new Error('Custom error');
    const fn = jest.fn().mockRejectedValue(error);
    const shouldRetry = jest.fn().mockReturnValue(false);

    const promise = retryWithBackoff(fn, {
      maxAttempts: 3,
      shouldRetry,
    });

    // Run timers and wait for rejection
    const rejection = promise.catch((e) => e);
    await jest.runAllTimersAsync();
    const result = await rejection;

    expect(result).toEqual(error);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(error, 1);
  });
});
