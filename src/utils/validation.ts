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

/**
 * Parsed address components for TaxCloud structured address format
 */
export interface ParsedAddress {
  line1: string;
  city: string;
  state: string;
  zip: string;
  countryCode: string;
}

/**
 * Parse a single address string into structured TaxCloud address components.
 *
 * Parses addresses in the format:
 *   "line1, city, state zip" or "line1, city, state zip-plus4"
 *
 * @example
 * parseAddressString("200 Spectrum Center Dr, Irvine, CA 92618")
 * // => { line1: "200 Spectrum Center Dr", city: "Irvine", state: "CA", zip: "92618", countryCode: "US" }
 *
 * @param address - Full address string to parse
 * @returns Parsed address with line1, city, state, zip, countryCode
 * @throws ZiptaxValidationError if the address cannot be parsed
 */
export function parseAddressString(address: string): ParsedAddress {
  if (!address || !address.trim()) {
    throw new ZiptaxValidationError(
      "Address string cannot be empty. Expected format: 'street, city, state zip'"
    );
  }

  const parts = address.split(',').map((p) => p.trim());

  if (parts.length < 3) {
    throw new ZiptaxValidationError(
      `Cannot parse address into structured components. ` +
        `Expected at least 3 comma-separated parts ` +
        `(street, city, state zip), got ${parts.length}: '${address}'`
    );
  }

  // line1 is everything before the last two segments
  const line1 = parts.slice(0, -2).join(', ');
  const city = parts[parts.length - 2];
  const stateZip = parts[parts.length - 1];

  // Parse state and zip from the last segment (e.g., "CA 92618" or "CA 92618-1905")
  const stateZipMatch = stateZip.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (!stateZipMatch) {
    throw new ZiptaxValidationError(
      `Cannot parse state and ZIP from address segment: '${stateZip}'. ` +
        `Expected format: 'ST 12345' or 'ST 12345-6789'`
    );
  }

  return {
    line1,
    city,
    state: stateZipMatch[1].toUpperCase(),
    zip: stateZipMatch[2],
    countryCode: 'US',
  };
}

/**
 * Validate product description query for TIC search endpoints.
 *
 * @param query - Natural language product description to validate
 * @throws ZiptaxValidationError if query is empty, not a string, or exceeds 500 characters
 */
export function validateProductQuery(query: string): void {
  if (typeof query !== 'string') {
    throw new ZiptaxValidationError('Product query must be a string');
  }

  if (!query || !query.trim()) {
    throw new ZiptaxValidationError('Product query cannot be empty');
  }

  if (query.length > 500) {
    throw new ZiptaxValidationError('Product query exceeds maximum length of 500 characters');
  }
}
