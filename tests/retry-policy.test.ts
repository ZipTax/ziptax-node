/**
 * Tests for the per-operation retry policy.
 *
 * The client retries reads, but must never silently re-send a non-idempotent
 * merchant write: a 502, a 504, or a client-side timeout leaves the outcome
 * unknown, and a second attempt can duplicate an order, a certificate, or a
 * refund.
 */

import axios from 'axios';
import { ZiptaxClient } from '../src/client';
import { ZiptaxAPIError, ZiptaxNetworkError } from '../src/exceptions';
import { ZiptaxConfig } from '../src/config';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

const MERCHANT_ID = '6b3c1f5e-2a8d-4c9b-9f2e-1d7a4b6c8e10';

const origin = { line1: '1 Market St', city: 'San Francisco', state: 'CA', zip: '94105' };
const destination = {
  line1: '200 Spectrum Center Dr',
  city: 'Irvine',
  state: 'CA',
  zip: '92618',
};

const cart = {
  customerId: 'customer-453',
  currency: { currencyCode: 'USD' as const },
  origin,
  destination,
  lineItems: [{ index: 0, itemId: 'sku-1001', price: 49.99, quantity: 2 }],
};

const orderRequest = {
  merchantId: MERCHANT_ID,
  orderId: 'order-1001',
  customerId: 'customer-453',
  transactionDate: '2026-08-07T00:00:00Z',
  completedDate: '2026-08-07T00:00:00Z',
  origin,
  destination,
  currency: { currencyCode: 'USD' as const },
  lineItems: [
    {
      index: 0,
      itemId: 'sku-1001',
      price: 49.99,
      quantity: 2,
      tax: { rate: 0.0775, amount: 7.75 },
    },
  ],
};

const certRequest = {
  merchantId: MERCHANT_ID,
  customerId: 'customer-453',
  customerName: 'Acme Supply Co',
  customerBusinessType: 'WholesaleTrade' as const,
  reason: 'Resale' as const,
  reasonDescription: 'Resale',
  address: destination,
  states: [{ abbreviation: 'CA' }],
};

/** A gateway error: the service answered, so it may already have committed. */
function gatewayError(status: number): {
  isAxiosError: boolean;
  response: { status: number; data: { message: string } };
} {
  return { isAxiosError: true, response: { status, data: { message: 'gateway' } } };
}

/** A client-side timeout or connection failure: no response was received. */
function networkError(): { isAxiosError: boolean; message: string; response: undefined } {
  return { isAxiosError: true, message: 'timeout of 30000ms exceeded', response: undefined };
}

describe('retry policy', () => {
  let request: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    request = jest.fn();
    mockedAxios.create.mockReturnValue({
      request,
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    } as unknown as ReturnType<typeof axios.create>);
    mockedAxios.isAxiosError.mockReturnValue(true);
  });

  // Retries use exponential backoff with a 1s initial delay, so shrink it.
  function makeClient(overrides: Partial<ZiptaxConfig> = {}): ZiptaxClient {
    return new ZiptaxClient({
      apiKey: 'test-api-key',
      retryOptions: { initialDelay: 1, maxDelay: 2 },
      ...overrides,
    });
  }

  describe('non-idempotent writes are never auto-retried', () => {
    const writes: Array<[string, (c: ZiptaxClient) => Promise<unknown>]> = [
      ['createOrder', (c): Promise<unknown> => c.createOrder(orderRequest)],
      [
        'createOrderFromCart',
        (c): Promise<unknown> =>
          c.createOrderFromCart({
            merchantId: MERCHANT_ID,
            cartId: 'cart-abc',
            orderId: 'order-1001',
          }),
      ],
      [
        'updateOrder',
        (c): Promise<unknown> =>
          c.updateOrder({
            merchantId: MERCHANT_ID,
            orderId: 'order-1001',
            completedDate: '2026-08-08T00:00:00Z',
          }),
      ],
      [
        'refundOrder',
        (c): Promise<unknown> => c.refundOrder({ merchantId: MERCHANT_ID, orderId: 'order-1001' }),
      ],
      [
        'createExemptionCertificate',
        (c): Promise<unknown> => c.createExemptionCertificate(certRequest),
      ],
      [
        'deleteExemptionCertificate',
        (c): Promise<unknown> =>
          c.deleteExemptionCertificate({ merchantId: MERCHANT_ID, certificateId: 'cert-1' }),
      ],
    ];

    describe.each(writes)('%s', (_name, call) => {
      it('sends exactly one request on a 502', async () => {
        request.mockRejectedValue(gatewayError(502));
        const client = makeClient();

        await expect(call(client)).rejects.toThrow(ZiptaxAPIError);
        expect(request).toHaveBeenCalledTimes(1);
      });

      it('sends exactly one request on a 504', async () => {
        request.mockRejectedValue(gatewayError(504));
        const client = makeClient();

        await expect(call(client)).rejects.toThrow(ZiptaxAPIError);
        expect(request).toHaveBeenCalledTimes(1);
      });

      it('sends exactly one request on a timeout', async () => {
        request.mockRejectedValue(networkError());
        const client = makeClient();

        await expect(call(client)).rejects.toThrow(ZiptaxNetworkError);
        expect(request).toHaveBeenCalledTimes(1);
      });

      it('surfaces the original error rather than a retry error', async () => {
        request.mockRejectedValue(gatewayError(502));
        const client = makeClient();

        await expect(call(client)).rejects.toThrow('gateway');
      });
    });
  });

  describe('reads are still retried', () => {
    it('retries a rate lookup on a 5xx', async () => {
      request
        .mockRejectedValueOnce(gatewayError(503))
        .mockResolvedValueOnce({ status: 200, data: { metadata: {} } });
      const client = makeClient();

      await client.getSalesTaxByAddress({ address: '200 Spectrum Center Dr' });

      expect(request).toHaveBeenCalledTimes(2);
    });

    it('retries getOrder on a 5xx, since it is a read', async () => {
      request
        .mockRejectedValueOnce(gatewayError(502))
        .mockResolvedValueOnce({ status: 200, data: { orderId: 'order-1001' } });
      const client = makeClient();

      await client.getOrder({ merchantId: MERCHANT_ID, orderId: 'order-1001' });

      expect(request).toHaveBeenCalledTimes(2);
    });

    it('retries listExemptionCertificates on a 5xx', async () => {
      request
        .mockRejectedValueOnce(gatewayError(502))
        .mockResolvedValueOnce({ status: 200, data: { items: [], limit: 20, nextCursor: null } });
      const client = makeClient();

      await client.listExemptionCertificates({ merchantId: MERCHANT_ID });

      expect(request).toHaveBeenCalledTimes(2);
    });
  });

  describe('calculateCart retries only when no response arrived', () => {
    it('retries on a timeout, where the request may not have been received', async () => {
      request
        .mockRejectedValueOnce(networkError())
        .mockResolvedValueOnce({ status: 200, data: { connectionId: 'tc', items: [] } });
      const client = makeClient();

      await client.calculateCart({ merchantId: MERCHANT_ID, items: [cart] });

      expect(request).toHaveBeenCalledTimes(2);
    });

    it('does not retry on a 504, where the service answered', async () => {
      request.mockRejectedValue(gatewayError(504));
      const client = makeClient();

      await expect(
        client.calculateCart({ merchantId: MERCHANT_ID, items: [cart] })
      ).rejects.toThrow(ZiptaxAPIError);
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('does not retry on a 502', async () => {
      request.mockRejectedValue(gatewayError(502));
      const client = makeClient();

      await expect(
        client.calculateCart({ merchantId: MERCHANT_ID, items: [cart] })
      ).rejects.toThrow(ZiptaxAPIError);
      expect(request).toHaveBeenCalledTimes(1);
    });
  });

  describe('per-call override', () => {
    it('lets a caller opt a write back into retrying', async () => {
      request
        .mockRejectedValueOnce(gatewayError(502))
        .mockResolvedValueOnce({ status: 200, data: { orderId: 'order-1001' } });
      const client = makeClient();

      await client.createOrder(orderRequest, {
        retryOptions: { maxAttempts: 2, initialDelay: 1 },
      });

      expect(request).toHaveBeenCalledTimes(2);
    });

    it('lets a caller tighten a read to a single attempt', async () => {
      request.mockRejectedValue(gatewayError(502));
      const client = makeClient();

      await expect(
        client.getOrder(
          { merchantId: MERCHANT_ID, orderId: 'order-1001' },
          { retryOptions: { maxAttempts: 1 } }
        )
      ).rejects.toThrow(ZiptaxAPIError);
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('keeps the environment header when a retry override is supplied', async () => {
      request.mockResolvedValue({ status: 200, data: { orderId: 'order-1001' } });
      const client = makeClient();

      await client.createOrder(orderRequest, {
        environment: 'TEST',
        retryOptions: { maxAttempts: 1 },
      });

      expect(request).toHaveBeenCalledWith(
        expect.objectContaining({ headers: { 'X-ENV': 'TEST' } })
      );
    });
  });

  it('does not leak retryOptions into the axios request config', async () => {
    request.mockResolvedValue({ status: 200, data: { orderId: 'order-1001' } });
    const client = makeClient();

    await client.createOrder(orderRequest);

    const sent = request.mock.calls[0][0];
    expect(sent).not.toHaveProperty('retryOptions');
  });
});
