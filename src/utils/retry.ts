/**
 * Retry utility for handling transient failures
 */

import { ZiptaxRetryError } from '../exceptions';

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Backoff multiplier */
  backoffMultiplier?: number;
  /** Function to determine if error should be retried */
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error: Error, _attempt: number) => {
    // Retry on network errors and 5xx server errors
    if (error.name === 'ZiptaxNetworkError') {
      return true;
    }
    if (error.name === 'ZiptaxAPIError') {
      const apiError = error as { statusCode?: number };
      return apiError.statusCode ? apiError.statusCode >= 500 : false;
    }
    return false;
  },
};

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  return Math.min(delay, options.maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts: Required<RetryOptions> = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isLastAttempt = attempt === opts.maxAttempts;
      const shouldRetry = opts.shouldRetry(lastError, attempt);

      if (isLastAttempt || !shouldRetry) {
        throw lastError;
      }

      const delay = calculateDelay(attempt, opts);
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new ZiptaxRetryError(
    `Maximum retry attempts (${opts.maxAttempts}) exceeded`,
    opts.maxAttempts,
    lastError
  );
}
