/**
 * Tests for exception classes
 */

import {
  ZiptaxError,
  ZiptaxAPIError,
  ZiptaxAuthenticationError,
  ZiptaxRateLimitError,
  ZiptaxValidationError,
  ZiptaxNetworkError,
  ZiptaxRetryError,
  ZiptaxConfigurationError,
} from '../src/exceptions';

describe('Exception classes', () => {
  describe('ZiptaxError', () => {
    it('should create error with message', () => {
      const error = new ZiptaxError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ZiptaxError');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ZiptaxError);
    });
  });

  describe('ZiptaxAPIError', () => {
    it('should create error with message only', () => {
      const error = new ZiptaxAPIError('API error');
      expect(error.message).toBe('API error');
      expect(error.name).toBe('ZiptaxAPIError');
      expect(error.statusCode).toBeUndefined();
      expect(error.responseBody).toBeUndefined();
      expect(error).toBeInstanceOf(ZiptaxError);
    });

    it('should create error with status code', () => {
      const error = new ZiptaxAPIError('API error', 500);
      expect(error.statusCode).toBe(500);
    });

    it('should create error with response body', () => {
      const body = { error: 'Internal Server Error' };
      const error = new ZiptaxAPIError('API error', 500, body);
      expect(error.statusCode).toBe(500);
      expect(error.responseBody).toEqual(body);
    });
  });

  describe('ZiptaxAuthenticationError', () => {
    it('should create error with default message', () => {
      const error = new ZiptaxAuthenticationError();
      expect(error.message).toBe('Authentication failed. Please check your API key.');
      expect(error.name).toBe('ZiptaxAuthenticationError');
      expect(error.statusCode).toBe(401);
      expect(error).toBeInstanceOf(ZiptaxAPIError);
    });

    it('should create error with custom message', () => {
      const error = new ZiptaxAuthenticationError('Invalid credentials');
      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(401);
    });
  });

  describe('ZiptaxRateLimitError', () => {
    it('should create error with default message', () => {
      const error = new ZiptaxRateLimitError();
      expect(error.message).toBe('Rate limit exceeded.');
      expect(error.name).toBe('ZiptaxRateLimitError');
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBeUndefined();
      expect(error).toBeInstanceOf(ZiptaxAPIError);
    });

    it('should create error with retry after', () => {
      const error = new ZiptaxRateLimitError('Rate limit', 60);
      expect(error.message).toBe('Rate limit');
      expect(error.retryAfter).toBe(60);
    });
  });

  describe('ZiptaxValidationError', () => {
    it('should create error with message only', () => {
      const error = new ZiptaxValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.name).toBe('ZiptaxValidationError');
      expect(error.errors).toBeUndefined();
      expect(error).toBeInstanceOf(ZiptaxError);
    });

    it('should create error with validation errors', () => {
      const errors = { field1: 'error1', field2: 'error2' };
      const error = new ZiptaxValidationError('Validation failed', errors);
      expect(error.message).toBe('Validation failed');
      expect(error.errors).toEqual(errors);
    });
  });

  describe('ZiptaxNetworkError', () => {
    it('should create error with default message', () => {
      const error = new ZiptaxNetworkError();
      expect(error.message).toBe('Network request failed.');
      expect(error.name).toBe('ZiptaxNetworkError');
      expect(error.originalError).toBeUndefined();
      expect(error).toBeInstanceOf(ZiptaxError);
    });

    it('should create error with custom message', () => {
      const error = new ZiptaxNetworkError('Connection timeout');
      expect(error.message).toBe('Connection timeout');
    });

    it('should create error with original error', () => {
      const originalError = new Error('ECONNREFUSED');
      const error = new ZiptaxNetworkError('Network failed', originalError);
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('ZiptaxRetryError', () => {
    it('should create error with attempts', () => {
      const error = new ZiptaxRetryError('Max retries exceeded', 3);
      expect(error.message).toBe('Max retries exceeded');
      expect(error.name).toBe('ZiptaxRetryError');
      expect(error.attempts).toBe(3);
      expect(error.lastError).toBeUndefined();
      expect(error).toBeInstanceOf(ZiptaxError);
    });

    it('should create error with last error', () => {
      const lastError = new Error('Last attempt failed');
      const error = new ZiptaxRetryError('Max retries exceeded', 3, lastError);
      expect(error.lastError).toBe(lastError);
    });
  });

  describe('ZiptaxConfigurationError', () => {
    it('should create error with message', () => {
      const error = new ZiptaxConfigurationError('Invalid config');
      expect(error.message).toBe('Invalid config');
      expect(error.name).toBe('ZiptaxConfigurationError');
      expect(error).toBeInstanceOf(ZiptaxError);
    });
  });
});
