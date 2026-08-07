/**
 * Event Webhook signature verification.
 *
 * Ziptax signs every delivery with a hex-encoded HMAC-SHA256 of the raw request
 * body, keyed with your account's signing secret, and sends it in the
 * `X-Signature` header.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { ZiptaxValidationError } from '../exceptions.js';
import { AnyWebhookEvent } from '../models/webhooks.js';

/** Header carrying the delivery signature */
export const WEBHOOK_SIGNATURE_HEADER = 'X-Signature';

/**
 * Compute the expected signature for a raw webhook body.
 *
 * @param rawBody - The exact bytes received, before any JSON parsing
 * @param signingSecret - Your account's signing secret (`whsec_...`)
 * @returns Hex-encoded HMAC-SHA256 of the body
 */
export function computeWebhookSignature(rawBody: string | Buffer, signingSecret: string): string {
  if (typeof signingSecret !== 'string' || signingSecret.length === 0) {
    throw new ZiptaxValidationError('signingSecret is required');
  }

  return createHmac('sha256', signingSecret).update(rawBody).digest('hex');
}

/**
 * Verify that a webhook delivery genuinely came from Ziptax.
 *
 * Verify against the **raw request body**, not a re-serialized object.
 * Frameworks that auto-parse JSON can reorder keys or change whitespace, which
 * changes the HMAC and breaks verification. Capture the raw bytes first, verify,
 * then parse.
 *
 * @param rawBody - The exact bytes received, before any JSON parsing
 * @param signature - Value of the `X-Signature` header
 * @param signingSecret - Your account's signing secret (`whsec_...`)
 * @returns true when the signature matches
 *
 * @example
 * ```typescript
 * app.use(express.raw({ type: 'application/json' }));
 *
 * app.post('/webhooks/ziptax', (req, res) => {
 *   const ok = verifyWebhookSignature(
 *     req.body,
 *     req.get('X-Signature'),
 *     process.env.ZIPTAX_SIGNING_SECRET
 *   );
 *   if (!ok) return res.sendStatus(401);
 *
 *   const event = JSON.parse(req.body.toString());
 *   res.sendStatus(200);
 * });
 * ```
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string | undefined | null,
  signingSecret: string
): boolean {
  const expected = computeWebhookSignature(rawBody, signingSecret);

  // A missing or wrong-length signature can never match. Comparing lengths
  // first is safe: the length of the expected digest is not a secret.
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signature ?? '', 'utf8');

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Verify a delivery and parse it into a typed event in one step.
 *
 * @param rawBody - The exact bytes received, before any JSON parsing
 * @param signature - Value of the `X-Signature` header
 * @param signingSecret - Your account's signing secret (`whsec_...`)
 * @returns The parsed event
 * @throws ZiptaxValidationError if the signature does not match or the body is
 *   not valid JSON
 */
export function parseWebhookEvent(
  rawBody: string | Buffer,
  signature: string | undefined | null,
  signingSecret: string
): AnyWebhookEvent {
  if (!verifyWebhookSignature(rawBody, signature, signingSecret)) {
    throw new ZiptaxValidationError('Webhook signature verification failed');
  }

  const text = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

  try {
    return JSON.parse(text) as AnyWebhookEvent;
  } catch {
    throw new ZiptaxValidationError('Webhook body is not valid JSON');
  }
}

/**
 * Parse a webhook `timestamp` into a Date.
 *
 * Ziptax formats it `YYYY-MM-DD HH:mm:ss.SSSZ` with a space separator, which is
 * not strict ISO-8601. This normalizes the separator and treats the value as
 * UTC.
 *
 * @param timestamp - The `timestamp` field from a webhook event
 * @returns The parsed Date
 * @throws ZiptaxValidationError if the timestamp cannot be parsed
 */
export function parseWebhookTimestamp(timestamp: string): Date {
  const normalized = timestamp.trim().replace(' ', 'T');
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw new ZiptaxValidationError(`Unparseable webhook timestamp: '${timestamp}'`);
  }

  return parsed;
}
