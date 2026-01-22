/**
 * Tests for validation utilities
 */

import {
  validateRequired,
  validateMaxLength,
  validatePattern,
  validateEnum,
  validateApiKey,
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
});
