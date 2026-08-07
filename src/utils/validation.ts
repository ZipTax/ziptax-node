/**
 * Input validation utilities
 */

import { ZiptaxValidationError } from '../exceptions';

/** Maximum length accepted by the TIC search and recommend endpoints */
export const MAX_PRODUCT_QUERY_LENGTH = 1024;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate that a value is not empty
 */
export function validateRequired(value: unknown, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ZiptaxValidationError(`${fieldName} is required`);
  }
}

/**
 * Validate string maximum length
 */
export function validateMaxLength(value: string, maxLength: number, fieldName: string): void {
  if (value.length > maxLength) {
    throw new ZiptaxValidationError(`${fieldName} must not exceed ${maxLength} characters`);
  }
}

/**
 * Validate string pattern
 */
export function validatePattern(
  value: string,
  pattern: RegExp,
  fieldName: string,
  patternDescription?: string
): void {
  if (!pattern.test(value)) {
    const description = patternDescription || pattern.toString();
    throw new ZiptaxValidationError(`${fieldName} must match pattern: ${description}`);
  }
}

/**
 * Validate enum value
 */
export function validateEnum<T>(value: T, allowedValues: readonly T[], fieldName: string): void {
  if (!allowedValues.includes(value)) {
    throw new ZiptaxValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
}

/**
 * Validate API key format
 */
export function validateApiKey(apiKey: string): void {
  validateRequired(apiKey, 'API key');
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new ZiptaxValidationError('API key must be a non-empty string');
  }
}

/**
 * Validate that a value is a UUID.
 *
 * Merchant identifiers returned by `POST /merchant/create` are UUIDs, and the
 * API rejects malformed ones with a 400. Checking locally turns that into a
 * clearer client-side error.
 */
export function validateUuid(value: unknown, fieldName: string): void {
  validateRequired(value, fieldName);
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new ZiptaxValidationError(`${fieldName} must be a valid UUID`);
  }
}

/**
 * Validate a finite number within an inclusive range
 */
export function validateNumberRange(
  value: unknown,
  min: number,
  max: number,
  fieldName: string
): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ZiptaxValidationError(`${fieldName} must be a finite number`);
  }
  if (value < min || value > max) {
    throw new ZiptaxValidationError(`${fieldName} must be between ${min} and ${max}`);
  }
}

/**
 * Validate a historical period in YYYYMM format
 */
export function validateHistorical(historical: string): void {
  validatePattern(historical, /^[0-9]{6}$/, 'historical', 'YYYYMM format');
}

/**
 * Validate product description query for TIC search endpoints.
 *
 * @param query - Natural language product description to validate
 * @throws ZiptaxValidationError if query is empty, not a string, or too long
 */
export function validateProductQuery(query: string): void {
  if (typeof query !== 'string') {
    throw new ZiptaxValidationError('Product query must be a string');
  }

  if (!query || !query.trim()) {
    throw new ZiptaxValidationError('Product query cannot be empty');
  }

  if (query.length > MAX_PRODUCT_QUERY_LENGTH) {
    throw new ZiptaxValidationError(
      `Product query exceeds maximum length of ${MAX_PRODUCT_QUERY_LENGTH} characters`
    );
  }
}
