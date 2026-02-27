/**
 * Tests for validation utilities
 */

import {
  validateRequired,
  validateMaxLength,
  validatePattern,
  validateEnum,
  validateApiKey,
  parseAddressString,
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

  describe('parseAddressString', () => {
    it('should parse a standard US address', () => {
      const result = parseAddressString('200 Spectrum Center Dr, Irvine, CA 92618');
      expect(result).toEqual({
        line1: '200 Spectrum Center Dr',
        city: 'Irvine',
        state: 'CA',
        zip: '92618',
        countryCode: 'US',
      });
    });

    it('should parse an address with ZIP+4', () => {
      const result = parseAddressString('200 Spectrum Center Dr, Irvine, CA 92618-1905');
      expect(result).toEqual({
        line1: '200 Spectrum Center Dr',
        city: 'Irvine',
        state: 'CA',
        zip: '92618-1905',
        countryCode: 'US',
      });
    });

    it('should parse a Minneapolis address', () => {
      const result = parseAddressString('323 Washington Ave N, Minneapolis, MN 55401-2427');
      expect(result).toEqual({
        line1: '323 Washington Ave N',
        city: 'Minneapolis',
        state: 'MN',
        zip: '55401-2427',
        countryCode: 'US',
      });
    });

    it('should handle addresses with more than 3 comma segments', () => {
      const result = parseAddressString('123 Main St, Suite 100, New York, NY 10001');
      expect(result).toEqual({
        line1: '123 Main St, Suite 100',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        countryCode: 'US',
      });
    });

    it('should uppercase state abbreviation', () => {
      const result = parseAddressString('123 Main St, Portland, or 97201');
      expect(result.state).toBe('OR');
    });

    it('should always return countryCode as US', () => {
      const result = parseAddressString('123 Main St, Dallas, TX 75001');
      expect(result.countryCode).toBe('US');
    });

    it('should throw for empty string', () => {
      expect(() => parseAddressString('')).toThrow(ZiptaxValidationError);
      expect(() => parseAddressString('')).toThrow('Address string cannot be empty');
    });

    it('should throw for whitespace-only string', () => {
      expect(() => parseAddressString('   ')).toThrow(ZiptaxValidationError);
      expect(() => parseAddressString('   ')).toThrow('Address string cannot be empty');
    });

    it('should throw for address with fewer than 3 segments', () => {
      expect(() => parseAddressString('bad address')).toThrow(ZiptaxValidationError);
      expect(() => parseAddressString('bad address')).toThrow(
        'Cannot parse address into structured components'
      );
    });

    it('should throw for address with only 2 segments', () => {
      expect(() => parseAddressString('123 Main St, CA 90210')).toThrow(ZiptaxValidationError);
      expect(() => parseAddressString('123 Main St, CA 90210')).toThrow(
        'Expected at least 3 comma-separated parts'
      );
    });

    it('should throw for invalid state/zip format', () => {
      expect(() => parseAddressString('123 Main St, City, INVALID')).toThrow(ZiptaxValidationError);
      expect(() => parseAddressString('123 Main St, City, INVALID')).toThrow(
        'Cannot parse state and ZIP'
      );
    });

    it('should throw for state/zip with no zip', () => {
      expect(() => parseAddressString('123 Main St, City, CA')).toThrow(ZiptaxValidationError);
    });

    it('should throw for state/zip with only 4-digit zip', () => {
      expect(() => parseAddressString('123 Main St, City, CA 9201')).toThrow(ZiptaxValidationError);
    });

    it('should throw for state with more than 2 letters', () => {
      expect(() => parseAddressString('123 Main St, City, CAL 92618')).toThrow(
        ZiptaxValidationError
      );
    });
  });
});
