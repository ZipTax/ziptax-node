/**
 * Custom exception classes for ZipTax SDK
 */

/**
 * Base error class for all ZipTax SDK errors
 */
export class ZiptaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZiptaxError';
    Object.setPrototypeOf(this, ZiptaxError.prototype);
  }
}

/**
 * Error thrown when API request fails
 */
export class ZiptaxAPIError extends ZiptaxError {
  public statusCode?: number;
  public responseBody?: unknown;

  constructor(message: string, statusCode?: number, responseBody?: unknown) {
    super(message);
    this.name = 'ZiptaxAPIError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, ZiptaxAPIError.prototype);
  }
}

/**
 * Error thrown when authentication fails
 */
export class ZiptaxAuthenticationError extends ZiptaxAPIError {
  constructor(message: string = 'Authentication failed. Please check your API key.') {
    super(message, 401);
    this.name = 'ZiptaxAuthenticationError';
    Object.setPrototypeOf(this, ZiptaxAuthenticationError.prototype);
  }
}

/**
 * Error thrown when rate limit is exceeded
 */
export class ZiptaxRateLimitError extends ZiptaxAPIError {
  public retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded.', retryAfter?: number) {
    super(message, 429);
    this.name = 'ZiptaxRateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, ZiptaxRateLimitError.prototype);
  }
}

/**
 * Error thrown when request validation fails
 */
export class ZiptaxValidationError extends ZiptaxError {
  public errors?: Record<string, string>;

  constructor(message: string, errors?: Record<string, string>) {
    super(message);
    this.name = 'ZiptaxValidationError';
    this.errors = errors;
    Object.setPrototypeOf(this, ZiptaxValidationError.prototype);
  }
}

/**
 * Error thrown when network request fails
 */
export class ZiptaxNetworkError extends ZiptaxError {
  public originalError?: Error;

  constructor(message: string = 'Network request failed.', originalError?: Error) {
    super(message);
    this.name = 'ZiptaxNetworkError';
    this.originalError = originalError;
    Object.setPrototypeOf(this, ZiptaxNetworkError.prototype);
  }
}

/**
 * Error thrown when maximum retry attempts are exceeded
 */
export class ZiptaxRetryError extends ZiptaxError {
  public attempts: number;
  public lastError?: Error;

  constructor(message: string, attempts: number, lastError?: Error) {
    super(message);
    this.name = 'ZiptaxRetryError';
    this.attempts = attempts;
    this.lastError = lastError;
    Object.setPrototypeOf(this, ZiptaxRetryError.prototype);
  }
}

/**
 * Error thrown when configuration is invalid
 */
export class ZiptaxConfigurationError extends ZiptaxError {
  constructor(message: string) {
    super(message);
    this.name = 'ZiptaxConfigurationError';
    Object.setPrototypeOf(this, ZiptaxConfigurationError.prototype);
  }
}
