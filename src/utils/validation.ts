/**
 * Input validation utilities
 */

import { ZiptaxValidationError } from '../exceptions';

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
