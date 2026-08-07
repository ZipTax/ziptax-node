/**
 * Event Webhook payload models.
 *
 * Webhook endpoints and subscriptions are configured from the platform
 * dashboard under Develop > Events, not through the API. These types describe
 * what Ziptax POSTs to your endpoint.
 */

/**
 * The kind of tax authority a rate change applies to
 */
export type WebhookLocality = 'USA-STATE' | 'CAN-PROVINCE';

/**
 * Event types Ziptax can deliver
 */
export type WebhookEventType = 'rate.updated';

/**
 * Which tax authority changed. Call the rate API for that authority to get the
 * new values; the webhook body is a trigger, not the rate data itself.
 */
export interface RateUpdateDetail {
  /** The kind of tax authority that changed */
  locality: WebhookLocality;
  /** Two-letter code of the state, province, or territory */
  code: string;
}

/**
 * Payload of a `rate.updated` event
 */
export interface RateUpdatedData {
  /** Which tax authority changed */
  rateUpdateDetail: RateUpdateDetail;
}

/**
 * Envelope shared by every webhook delivery
 */
export interface WebhookEvent<T = unknown> {
  /** The event type */
  event: WebhookEventType;
  /**
   * When the event was generated, in UTC. Formatted `YYYY-MM-DD HH:mm:ss.SSSZ`
   * with a space separator, which is not strict ISO-8601. Use
   * {@link parseWebhookTimestamp} rather than passing it straight to `Date`.
   */
  timestamp: string;
  /** Event-specific payload */
  data: T;
}

/**
 * A `rate.updated` webhook delivery
 */
export type RateUpdatedEvent = WebhookEvent<RateUpdatedData>;

/**
 * Any webhook delivery Ziptax can send
 */
export type AnyWebhookEvent = RateUpdatedEvent;
