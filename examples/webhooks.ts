/**
 * Event Webhook verification example for ZipTax SDK
 *
 * Webhook endpoints and event subscriptions are configured from the platform
 * dashboard under Develop > Events, not through the API. This example shows how
 * to verify a delivery once it arrives.
 *
 * Usage:
 *   ZIPTAX_SIGNING_SECRET=whsec_... npm run example:webhooks
 */

import { createHmac } from 'crypto';
import {
  parseWebhookEvent,
  parseWebhookTimestamp,
  verifyWebhookSignature,
  WEBHOOK_SIGNATURE_HEADER,
  RateUpdatedEvent,
} from '../src';

async function main() {
  const signingSecret = process.env.ZIPTAX_SIGNING_SECRET || '';

  if (!signingSecret) {
    console.error('Error: Please set ZIPTAX_SIGNING_SECRET');
    console.error('Usage: ZIPTAX_SIGNING_SECRET=whsec_... npm run example:webhooks');
    process.exit(1);
  }

  console.log('ZipTax SDK Webhook Verification Example');
  console.log('========================================\n');

  // Stand in for a real delivery. In production this is the raw request body
  // and the X-Signature header, both supplied by Ziptax.
  const rawBody = JSON.stringify({
    event: 'rate.updated',
    timestamp: '2026-06-11 00:00:00.000Z',
    data: { rateUpdateDetail: { locality: 'USA-STATE', code: 'CA' } },
  });
  const signature = createHmac('sha256', signingSecret).update(rawBody).digest('hex');

  console.log(`1. Verifying a delivery (${WEBHOOK_SIGNATURE_HEADER})...`);
  console.log('Valid:', verifyWebhookSignature(rawBody, signature, signingSecret));
  console.log('---\n');

  console.log('2. Rejecting a tampered body...');
  const tampered = rawBody.replace('"CA"', '"NY"');
  console.log('Valid:', verifyWebhookSignature(tampered, signature, signingSecret));
  console.log('---\n');

  console.log('3. Verifying and parsing in one step...');
  const event = parseWebhookEvent(rawBody, signature, signingSecret) as RateUpdatedEvent;
  console.log('Event:', event.event);
  console.log('Locality:', event.data.rateUpdateDetail.locality);
  console.log('Code:', event.data.rateUpdateDetail.code);
  console.log('---\n');

  // The timestamp uses a space separator, which is not strict ISO-8601.
  console.log('4. Parsing the timestamp...');
  console.log('Raw:', event.timestamp);
  console.log('Parsed:', parseWebhookTimestamp(event.timestamp).toISOString());
  console.log('---\n');

  console.log('The event body is a trigger, not the rate data. Call the rate API');
  console.log('for the named authority to read the new values.');
}

main();
