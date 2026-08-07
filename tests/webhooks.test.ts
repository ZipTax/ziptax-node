/**
 * Tests for webhook signature verification and event parsing
 */

import { createHmac } from 'crypto';
import {
  WEBHOOK_SIGNATURE_HEADER,
  computeWebhookSignature,
  verifyWebhookSignature,
  parseWebhookEvent,
  parseWebhookTimestamp,
} from '../src/utils/webhooks';
import { ZiptaxValidationError } from '../src/exceptions';
import { RateUpdatedEvent } from '../src/models';

const SECRET = 'whsec_test_secret';

const eventBody = JSON.stringify({
  event: 'rate.updated',
  timestamp: '2026-06-11 00:00:00.000Z',
  data: { rateUpdateDetail: { locality: 'USA-STATE', code: 'CA' } },
});

function sign(body: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

describe('webhooks', () => {
  it('should expose the signature header name', () => {
    expect(WEBHOOK_SIGNATURE_HEADER).toBe('X-Signature');
  });

  describe('computeWebhookSignature', () => {
    it('should produce a hex-encoded HMAC-SHA256 of the body', () => {
      expect(computeWebhookSignature(eventBody, SECRET)).toBe(sign(eventBody));
    });

    it('should produce the same digest for a Buffer and a string body', () => {
      expect(computeWebhookSignature(Buffer.from(eventBody), SECRET)).toBe(
        computeWebhookSignature(eventBody, SECRET)
      );
    });

    it('should reject a missing signing secret', () => {
      expect(() => computeWebhookSignature(eventBody, '')).toThrow(ZiptaxValidationError);
      expect(() => computeWebhookSignature(eventBody, undefined as unknown as string)).toThrow(
        ZiptaxValidationError
      );
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should accept a valid signature', () => {
      expect(verifyWebhookSignature(eventBody, sign(eventBody), SECRET)).toBe(true);
    });

    it('should accept a valid signature over a Buffer body', () => {
      expect(verifyWebhookSignature(Buffer.from(eventBody), sign(eventBody), SECRET)).toBe(true);
    });

    it('should reject a signature computed with a different secret', () => {
      expect(verifyWebhookSignature(eventBody, sign(eventBody, 'whsec_other'), SECRET)).toBe(false);
    });

    it('should reject a tampered body', () => {
      const signature = sign(eventBody);
      const tampered = eventBody.replace('"CA"', '"NY"');
      expect(verifyWebhookSignature(tampered, signature, SECRET)).toBe(false);
    });

    it('should reject a missing signature', () => {
      expect(verifyWebhookSignature(eventBody, undefined, SECRET)).toBe(false);
      expect(verifyWebhookSignature(eventBody, null, SECRET)).toBe(false);
      expect(verifyWebhookSignature(eventBody, '', SECRET)).toBe(false);
    });

    it('should reject a signature of the wrong length without throwing', () => {
      expect(verifyWebhookSignature(eventBody, 'abc123', SECRET)).toBe(false);
    });
  });

  describe('parseWebhookEvent', () => {
    it('should verify and parse a rate.updated event', () => {
      const event = parseWebhookEvent(eventBody, sign(eventBody), SECRET) as RateUpdatedEvent;

      expect(event.event).toBe('rate.updated');
      expect(event.data.rateUpdateDetail).toEqual({ locality: 'USA-STATE', code: 'CA' });
    });

    it('should throw when the signature does not match', () => {
      expect(() => parseWebhookEvent(eventBody, 'deadbeef', SECRET)).toThrow(ZiptaxValidationError);
    });

    it('should throw when the body is not valid JSON', () => {
      const bad = 'not json';
      expect(() => parseWebhookEvent(bad, sign(bad), SECRET)).toThrow(/not valid JSON/);
    });

    it('should accept a Buffer body', () => {
      const buf = Buffer.from(eventBody);
      const event = parseWebhookEvent(buf, sign(eventBody), SECRET);
      expect(event.event).toBe('rate.updated');
    });
  });

  describe('parseWebhookTimestamp', () => {
    it('should parse the space-separated UTC format the API sends', () => {
      const date = parseWebhookTimestamp('2026-06-11 00:00:00.000Z');
      expect(date.toISOString()).toBe('2026-06-11T00:00:00.000Z');
    });

    it('should parse a strict ISO-8601 timestamp too', () => {
      const date = parseWebhookTimestamp('2026-06-11T12:30:00.000Z');
      expect(date.toISOString()).toBe('2026-06-11T12:30:00.000Z');
    });

    it('should throw on an unparseable timestamp', () => {
      expect(() => parseWebhookTimestamp('not a date')).toThrow(ZiptaxValidationError);
    });
  });
});
