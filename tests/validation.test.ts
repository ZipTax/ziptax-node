/**
 * Tests for validation utilities
 */

import {
  validateRequired,
  validateMaxLength,
  validatePattern,
  validateEnum,
  validateApiKey,
  validateUuid,
  validateNumberRange,
  validateHistorical,
  validateProductQuery,
  MAX_PRODUCT_QUERY_LENGTH,
} from '../src/utils/validation';
import { ZiptaxValidationError } from '../src/exceptions';

describe('Validation utilities', () => {
  describe('validateRequired', () => {
    it('should pass for non-empty values', () => {
      expect(() => validateRequired('test', 'field')).not.toThrow();
      expect(() => validateRequired(0, 'field')).not.toThrow();
      expect(() => validateRequired(false, 'field')).not.toThrow();
    });

    it('should throw for undefined', () => {
      expect(() => validateRequired(undefined, 'field')).toThrow(ZiptaxValidationError);
      expect(() => validateRequired(undefined, 'field')).toThrow('field is required');
    });

    it('should throw for null', () => {
      expect(() => validateRequired(null, 'field')).toThrow(ZiptaxValidationError);
      expect(() => validateRequired(null, 'field')).toThrow('field is required');
    });

    it('should throw for empty string', () => {
      expect(() => validateRequired('', 'field')).toThrow(ZiptaxValidationError);
      expect(() => validateRequired('', 'field')).toThrow('field is required');
    });
  });

  describe('validateMaxLength', () => {
    it('should pass for strings within limit', () => {
      expect(() => validateMaxLength('test', 10, 'field')).not.toThrow();
      expect(() => validateMaxLength('test', 4, 'field')).not.toThrow();
    });

    it('should throw for strings exceeding limit', () => {
      expect(() => validateMaxLength('test', 3, 'field')).toThrow(ZiptaxValidationError);
      expect(() => validateMaxLength('test', 3, 'field')).toThrow(
        'field must not exceed 3 characters'
      );
    });
  });

  describe('validatePattern', () => {
    it('should pass for matching patterns', () => {
      expect(() => validatePattern('12345', /^\d+$/, 'field')).not.toThrow();
      expect(() => validatePattern('test@example.com', /^[\w.]+@[\w.]+$/, 'field')).not.toThrow();
    });

    it('should throw for non-matching patterns', () => {
      expect(() => validatePattern('abc', /^\d+$/, 'field')).toThrow(ZiptaxValidationError);
    });

    it('should include pattern description in error', () => {
      expect(() => validatePattern('abc', /^\d+$/, 'field', 'numeric only')).toThrow(
        'field must match pattern: numeric only'
      );
    });

    it('should include pattern regex in error when no description', () => {
      expect(() => validatePattern('abc', /^\d+$/, 'field')).toThrow(/field must match pattern:/);
    });
  });

  describe('validateEnum', () => {
    it('should pass for valid enum values', () => {
      expect(() => validateEnum('USA', ['USA', 'CAN'], 'country')).not.toThrow();
      expect(() => validateEnum('CAN', ['USA', 'CAN'], 'country')).not.toThrow();
    });

    it('should throw for invalid enum values', () => {
      expect(() => validateEnum('MEX', ['USA', 'CAN'], 'country')).toThrow(ZiptaxValidationError);
      expect(() => validateEnum('MEX', ['USA', 'CAN'], 'country')).toThrow(
        'country must be one of: USA, CAN'
      );
    });

    it('should work with number enums', () => {
      expect(() => validateEnum(1, [1, 2, 3], 'status')).not.toThrow();
      expect(() => validateEnum(4, [1, 2, 3], 'status')).toThrow(ZiptaxValidationError);
    });
  });

  describe('validateApiKey', () => {
    it('should pass for valid API keys', () => {
      expect(() => validateApiKey('valid-api-key')).not.toThrow();
      expect(() => validateApiKey('abc123')).not.toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => validateApiKey('')).toThrow(ZiptaxValidationError);
      expect(() => validateApiKey('')).toThrow('API key is required');
    });

    it('should throw for whitespace-only string', () => {
      expect(() => validateApiKey('   ')).toThrow(ZiptaxValidationError);
      expect(() => validateApiKey('   ')).toThrow('API key must be a non-empty string');
    });
  });

  describe('validateUuid', () => {
    it('should pass for a valid UUID', () => {
      expect(() =>
        validateUuid('6b3c1f5e-2a8d-4c9b-9f2e-1d7a4b6c8e10', 'merchantId')
      ).not.toThrow();
    });

    it('should pass for an uppercase UUID', () => {
      expect(() =>
        validateUuid('6B3C1F5E-2A8D-4C9B-9F2E-1D7A4B6C8E10', 'merchantId')
      ).not.toThrow();
    });

    it('should throw for a malformed UUID', () => {
      expect(() => validateUuid('not-a-uuid', 'merchantId')).toThrow(ZiptaxValidationError);
      expect(() => validateUuid('not-a-uuid', 'merchantId')).toThrow(
        'merchantId must be a valid UUID'
      );
    });

    it('should throw for a UUID missing separators', () => {
      expect(() => validateUuid('6b3c1f5e2a8d4c9b9f2e1d7a4b6c8e10', 'merchantId')).toThrow(
        ZiptaxValidationError
      );
    });

    it('should throw for an empty value', () => {
      expect(() => validateUuid('', 'merchantId')).toThrow('merchantId is required');
    });

    it('should throw for a non-string value', () => {
      expect(() => validateUuid(42, 'merchantId')).toThrow(ZiptaxValidationError);
    });
  });

  describe('validateNumberRange', () => {
    it('should pass for a value inside the range', () => {
      expect(() => validateNumberRange(0, -90, 90, 'lat')).not.toThrow();
      expect(() => validateNumberRange(-90, -90, 90, 'lat')).not.toThrow();
      expect(() => validateNumberRange(90, -90, 90, 'lat')).not.toThrow();
    });

    it('should throw for a value outside the range', () => {
      expect(() => validateNumberRange(91, -90, 90, 'lat')).toThrow(
        'lat must be between -90 and 90'
      );
    });

    it('should throw for a non-finite value', () => {
      expect(() => validateNumberRange(NaN, 0, 1, 'x')).toThrow('x must be a finite number');
      expect(() => validateNumberRange(Infinity, 0, 1, 'x')).toThrow(ZiptaxValidationError);
    });

    it('should throw for a non-number value', () => {
      expect(() => validateNumberRange('5', 0, 10, 'x')).toThrow(ZiptaxValidationError);
    });
  });

  describe('validateHistorical', () => {
    it('should pass for YYYYMM', () => {
      expect(() => validateHistorical('202401')).not.toThrow();
    });

    it('should throw for YYYY-MM', () => {
      expect(() => validateHistorical('2024-01')).toThrow(ZiptaxValidationError);
    });

    it('should throw for a non-numeric value', () => {
      expect(() => validateHistorical('janfeb')).toThrow(ZiptaxValidationError);
    });
  });

  describe('validateProductQuery', () => {
    it('should pass for a normal description', () => {
      expect(() => validateProductQuery('baked bread in plastic packaging')).not.toThrow();
    });

    it('should accept a query at the maximum length', () => {
      expect(() => validateProductQuery('a'.repeat(MAX_PRODUCT_QUERY_LENGTH))).not.toThrow();
    });

    it('should throw past the maximum length', () => {
      expect(() => validateProductQuery('a'.repeat(MAX_PRODUCT_QUERY_LENGTH + 1))).toThrow(
        `Product query exceeds maximum length of ${MAX_PRODUCT_QUERY_LENGTH} characters`
      );
    });

    it('should throw for an empty or whitespace-only query', () => {
      expect(() => validateProductQuery('')).toThrow('Product query cannot be empty');
      expect(() => validateProductQuery('   ')).toThrow('Product query cannot be empty');
    });

    it('should throw for a non-string query', () => {
      expect(() => validateProductQuery(42 as unknown as string)).toThrow(
        'Product query must be a string'
      );
    });
  });
});
