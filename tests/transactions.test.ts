/**
 * Tests for Merchant Transactions: cart calculation, orders, refunds,
 * and exemption certificates
 */

import { ZiptaxClient } from '../src/client';
import { ZiptaxValidationError } from '../src/exceptions';
import { HTTPClient } from '../src/utils/http';
import { Cart, CalculateCartRequest, OrderLineItem, isTaxCloudCartResponse } from '../src/models';
import { NO_RETRY, RETRY_ON_NO_RESPONSE } from '../src/utils/retry';

jest.mock('../src/utils/http');

const MERCHANT_ID = '6b3c1f5e-2a8d-4c9b-9f2e-1d7a4b6c8e10';

// Reads carry the client's default retry policy; non-idempotent writes are
// pinned to a single attempt so an unknown outcome is never re-sent. See
// tests/retry-policy.test.ts for the behavioural coverage.
const LIVE_READ_CONFIG = { headers: { 'X-ENV': 'LIVE' }, retryOptions: undefined };
const LIVE_WRITE_CONFIG = { headers: { 'X-ENV': 'LIVE' }, retryOptions: NO_RETRY };
const LIVE_CART_CONFIG = {
  headers: { 'X-ENV': 'LIVE' },
  retryOptions: RETRY_ON_NO_RESPONSE,
};

const origin = { line1: '1 Market St', city: 'San Francisco', state: 'CA', zip: '94105' };
const destination = {
  line1: '200 Spectrum Center Dr',
  city: 'Irvine',
  state: 'CA',
  zip: '92618',
};

function buildCart(overrides: Partial<Cart> = {}): Cart {
  return {
    customerId: 'customer-453',
    currency: { currencyCode: 'USD' },
    origin,
    destination,
    lineItems: [{ index: 0, itemId: 'sku-1001', price: 49.99, quantity: 2 }],
    ...overrides,
  };
}

function buildCartRequest(overrides: Partial<CalculateCartRequest> = {}): CalculateCartRequest {
  return { merchantId: MERCHANT_ID, items: [buildCart()], ...overrides };
}

const mockTaxCloudCartResponse = {
  connectionId: 'tc-connection',
  transactionDate: '2026-08-07T00:00:00Z',
  items: [
    {
      cartId: 'cart-abc',
      customerId: 'customer-453',
      origin: { ...origin, countryCode: 'US' as const },
      destination: { ...destination, countryCode: 'US' as const },
      currency: { currencyCode: 'USD' as const },
      deliveredBySeller: false,
      exemption: { exemptionId: null, isExempt: null },
      lineItems: [
        {
          index: 0,
          itemId: 'sku-1001',
          price: 49.99,
          originalPrice: 49.99,
          quantity: 2,
          tic: null,
          tax: { rate: 0.0775, amount: 7.75 },
        },
      ],
    },
  ],
};

const mockSelfManagedCartResponse = {
  items: [
    {
      cartId: 'cart-xyz',
      customerId: 'customer-453',
      origin: { ...origin, countryCode: 'US' as const },
      destination: { ...destination, countryCode: 'US' as const },
      currency: { currencyCode: 'USD' as const },
      lineItems: [
        {
          index: 0,
          itemId: 'sku-1001',
          price: 49.99,
          originalPrice: 49.99,
          quantity: 2,
          tic: null,
          tax: { rate: 0.0775, amount: 7.75 },
        },
      ],
    },
  ],
};

const mockOrderResponse = {
  connectionId: 'tc-connection',
  orderId: 'order-1001',
  kind: 'order' as const,
  customerId: 'customer-453',
  transactionDate: '2026-08-07T00:00:00Z',
  completedDate: '2026-08-07T00:00:00Z',
  origin: { ...origin, countryCode: 'US' as const },
  destination: { ...destination, countryCode: 'US' as const },
  currency: { currencyCode: 'USD' as const },
  lineItems: null,
  deliveredBySeller: false,
  exemption: { exemptionId: null, isExempt: null },
  channel: null,
  excludeFromFiling: false,
};

const orderLineItem: OrderLineItem = {
  index: 0,
  itemId: 'sku-1001',
  price: 49.99,
  quantity: 2,
  tax: { rate: 0.0775, amount: 7.75 },
};

describe('Merchant Transactions', () => {
  let mockHttpClient: jest.Mocked<HTTPClient>;
  let client: ZiptaxClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
    } as unknown as jest.Mocked<HTTPClient>;
    (HTTPClient as jest.MockedClass<typeof HTTPClient>).mockImplementation(() => mockHttpClient);
    client = new ZiptaxClient({ apiKey: 'test-api-key' });
  });

  describe('calculateCart', () => {
    it('should calculate cart tax for a merchant', async () => {
      mockHttpClient.post.mockResolvedValue(mockTaxCloudCartResponse);

      const request = buildCartRequest();
      const result = await client.calculateCart(request);

      expect(result).toEqual(mockTaxCloudCartResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/merchant/cart/calculate',
        request,
        LIVE_CART_CONFIG
      );
    });

    it('should send X-ENV: TEST when the client is configured for TEST', async () => {
      mockHttpClient.post.mockResolvedValue(mockTaxCloudCartResponse);
      const testClient = new ZiptaxClient({ apiKey: 'test-api-key', environment: 'TEST' });

      await testClient.calculateCart(buildCartRequest());

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/merchant/cart/calculate',
        expect.anything(),
        { headers: { 'X-ENV': 'TEST' }, retryOptions: RETRY_ON_NO_RESPONSE }
      );
    });

    it('should let a per-request option override the client environment', async () => {
      mockHttpClient.post.mockResolvedValue(mockTaxCloudCartResponse);

      await client.calculateCart(buildCartRequest(), { environment: 'TEST' });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/merchant/cart/calculate',
        expect.anything(),
        { headers: { 'X-ENV': 'TEST' }, retryOptions: RETRY_ON_NO_RESPONSE }
      );
    });

    it('should accept multiple carts', async () => {
      mockHttpClient.post.mockResolvedValue(mockTaxCloudCartResponse);

      await expect(
        client.calculateCart({
          merchantId: MERCHANT_ID,
          items: [buildCart(), buildCart({ customerId: 'customer-999' })],
        })
      ).resolves.toBeDefined();
    });

    it('should reject more than 100 carts', async () => {
      const items = Array.from({ length: 101 }, () => buildCart());
      await expect(client.calculateCart({ merchantId: MERCHANT_ID, items })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should reject an empty items array', async () => {
      await expect(client.calculateCart({ merchantId: MERCHANT_ID, items: [] })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should reject a malformed merchantId', async () => {
      await expect(
        client.calculateCart({ merchantId: 'nope', items: [buildCart()] })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject an unsupported currency', async () => {
      await expect(
        client.calculateCart(
          buildCartRequest({
            items: [
              buildCart({
                currency: { currencyCode: 'EUR' as unknown as 'USD' },
              }),
            ],
          })
        )
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should accept CAD', async () => {
      mockHttpClient.post.mockResolvedValue(mockTaxCloudCartResponse);

      await expect(
        client.calculateCart(
          buildCartRequest({ items: [buildCart({ currency: { currencyCode: 'CAD' } })] })
        )
      ).resolves.toBeDefined();
    });

    it('should accept a cart with no explicit currencyCode', async () => {
      mockHttpClient.post.mockResolvedValue(mockTaxCloudCartResponse);

      await expect(
        client.calculateCart(buildCartRequest({ items: [buildCart({ currency: {} })] }))
      ).resolves.toBeDefined();
    });

    it('should require a structured origin address', async () => {
      await expect(
        client.calculateCart(
          buildCartRequest({
            items: [buildCart({ origin: undefined as unknown as typeof origin })],
          })
        )
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should require each address component', async () => {
      await expect(
        client.calculateCart(
          buildCartRequest({
            items: [
              buildCart({
                destination: {
                  line1: '200 Spectrum Center Dr',
                  city: '',
                  state: 'CA',
                  zip: '92618',
                },
              }),
            ],
          })
        )
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject duplicate line item indexes', async () => {
      await expect(
        client.calculateCart(
          buildCartRequest({
            items: [
              buildCart({
                lineItems: [
                  { index: 0, itemId: 'sku-1', price: 10, quantity: 1 },
                  { index: 0, itemId: 'sku-2', price: 20, quantity: 1 },
                ],
              }),
            ],
          })
        )
      ).rejects.toThrow(/unique index/);
    });

    it('should reject a non-integer line item index', async () => {
      await expect(
        client.calculateCart(
          buildCartRequest({
            items: [
              buildCart({ lineItems: [{ index: 0.5, itemId: 'sku-1', price: 10, quantity: 1 }] }),
            ],
          })
        )
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a line item index above 500', async () => {
      await expect(
        client.calculateCart(
          buildCartRequest({
            items: [
              buildCart({ lineItems: [{ index: 501, itemId: 'sku-1', price: 10, quantity: 1 }] }),
            ],
          })
        )
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a negative price', async () => {
      await expect(
        client.calculateCart(
          buildCartRequest({
            items: [
              buildCart({ lineItems: [{ index: 0, itemId: 'sku-1', price: -1, quantity: 1 }] }),
            ],
          })
        )
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should accept a zero price', async () => {
      mockHttpClient.post.mockResolvedValue(mockTaxCloudCartResponse);

      await expect(
        client.calculateCart(
          buildCartRequest({
            items: [
              buildCart({ lineItems: [{ index: 0, itemId: 'sku-1', price: 0, quantity: 1 }] }),
            ],
          })
        )
      ).resolves.toBeDefined();
    });

    it('should accept a fractional quantity', async () => {
      mockHttpClient.post.mockResolvedValue(mockTaxCloudCartResponse);

      await expect(
        client.calculateCart(
          buildCartRequest({
            items: [
              buildCart({ lineItems: [{ index: 0, itemId: 'sku-1', price: 10, quantity: 1.5 }] }),
            ],
          })
        )
      ).resolves.toBeDefined();
    });

    it('should reject a quantity above the maximum', async () => {
      await expect(
        client.calculateCart(
          buildCartRequest({
            items: [
              buildCart({
                lineItems: [{ index: 0, itemId: 'sku-1', price: 10, quantity: 100000 }],
              }),
            ],
          })
        )
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject an out-of-range tic', async () => {
      await expect(
        client.calculateCart(
          buildCartRequest({
            items: [
              buildCart({
                lineItems: [{ index: 0, itemId: 'sku-1', price: 10, quantity: 1, tic: 100001 }],
              }),
            ],
          })
        )
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject an empty lineItems array', async () => {
      await expect(
        client.calculateCart(buildCartRequest({ items: [buildCart({ lineItems: [] })] }))
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a cartId over 50 characters', async () => {
      await expect(
        client.calculateCart(buildCartRequest({ items: [buildCart({ cartId: 'c'.repeat(51) })] }))
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should pass discounts and exemption through untouched', async () => {
      mockHttpClient.post.mockResolvedValue(mockTaxCloudCartResponse);

      const request = buildCartRequest({
        items: [
          buildCart({
            exemption: { exemptionId: 'cert-1' },
            discounts: {
              lineItemDiscounts: [{ itemId: 'sku-1001', type: 'percentage', value: 0.1 }],
              orderDiscount: { type: 'amount', value: 5 },
            },
          }),
        ],
      });

      await client.calculateCart(request);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/merchant/cart/calculate',
        request,
        LIVE_CART_CONFIG
      );
    });
  });

  describe('isTaxCloudCartResponse', () => {
    it('should identify a TaxCloud-connected response', () => {
      expect(isTaxCloudCartResponse(mockTaxCloudCartResponse)).toBe(true);
    });

    it('should identify a self-managed response', () => {
      expect(isTaxCloudCartResponse(mockSelfManagedCartResponse)).toBe(false);
    });

    it('should narrow the type so connectionId is reachable', async () => {
      mockHttpClient.post.mockResolvedValue(mockTaxCloudCartResponse);

      const result = await client.calculateCart(buildCartRequest());

      if (isTaxCloudCartResponse(result)) {
        expect(result.connectionId).toBe('tc-connection');
      } else {
        throw new Error('expected a TaxCloud-connected response');
      }
    });
  });

  describe('createOrder', () => {
    const validOrder = {
      merchantId: MERCHANT_ID,
      orderId: 'order-1001',
      customerId: 'customer-453',
      transactionDate: '2026-08-07T00:00:00Z',
      completedDate: '2026-08-07T00:00:00Z',
      origin,
      destination,
      currency: { currencyCode: 'USD' as const },
      lineItems: [orderLineItem],
    };

    it('should create an order', async () => {
      mockHttpClient.post.mockResolvedValue(mockOrderResponse);

      const result = await client.createOrder(validOrder);

      expect(result).toEqual(mockOrderResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/merchant/order/create',
        validOrder,
        LIVE_WRITE_CONFIG
      );
    });

    it('should reject a missing merchantId', async () => {
      await expect(client.createOrder({ ...validOrder, merchantId: '' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should reject a missing orderId', async () => {
      await expect(client.createOrder({ ...validOrder, orderId: '' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should reject an orderId over 50 characters', async () => {
      await expect(client.createOrder({ ...validOrder, orderId: 'o'.repeat(51) })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should reject a missing transactionDate', async () => {
      await expect(client.createOrder({ ...validOrder, transactionDate: '' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should reject a missing completedDate', async () => {
      await expect(client.createOrder({ ...validOrder, completedDate: '' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should reject an empty lineItems array', async () => {
      await expect(client.createOrder({ ...validOrder, lineItems: [] })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should require tax on each line item', async () => {
      await expect(
        client.createOrder({
          ...validOrder,
          lineItems: [
            { index: 0, itemId: 'sku-1', price: 10, quantity: 1 } as unknown as OrderLineItem,
          ],
        })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should accept a credit order', async () => {
      mockHttpClient.post.mockResolvedValue({ ...mockOrderResponse, kind: 'credit' });

      const result = await client.createOrder({ ...validOrder, kind: 'credit' });

      expect(result.kind).toBe('credit');
    });
  });

  describe('createOrderFromCart', () => {
    it('should create an order from a cart', async () => {
      mockHttpClient.post.mockResolvedValue(mockOrderResponse);

      const request = { merchantId: MERCHANT_ID, cartId: 'cart-abc', orderId: 'order-1001' };
      const result = await client.createOrderFromCart(request);

      expect(result).toEqual(mockOrderResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/merchant/order/create-from-cart',
        request,
        LIVE_WRITE_CONFIG
      );
    });

    it('should reject a missing cartId', async () => {
      await expect(
        client.createOrderFromCart({ merchantId: MERCHANT_ID, cartId: '', orderId: 'order-1' })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a missing orderId', async () => {
      await expect(
        client.createOrderFromCart({ merchantId: MERCHANT_ID, cartId: 'cart-abc', orderId: '' })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a malformed merchantId', async () => {
      await expect(
        client.createOrderFromCart({ merchantId: 'x', cartId: 'cart-abc', orderId: 'order-1' })
      ).rejects.toThrow(ZiptaxValidationError);
    });
  });

  describe('getOrder', () => {
    it('should retrieve an order', async () => {
      mockHttpClient.post.mockResolvedValue(mockOrderResponse);

      const request = { merchantId: MERCHANT_ID, orderId: 'order-1001' };
      const result = await client.getOrder(request);

      expect(result).toEqual(mockOrderResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/merchant/order/get',
        request,
        LIVE_READ_CONFIG
      );
    });

    it('should support expanding refunds', async () => {
      mockHttpClient.post.mockResolvedValue({ ...mockOrderResponse, refunds: [] });

      const request = {
        merchantId: MERCHANT_ID,
        orderId: 'order-1001',
        expand: 'refunds' as const,
      };
      const result = await client.getOrder(request);

      expect(result.refunds).toEqual([]);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/merchant/order/get',
        request,
        LIVE_READ_CONFIG
      );
    });

    it('should reject a missing orderId', async () => {
      await expect(client.getOrder({ merchantId: MERCHANT_ID, orderId: '' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });
  });

  describe('updateOrder', () => {
    it('should update an order', async () => {
      mockHttpClient.post.mockResolvedValue(mockOrderResponse);

      const request = {
        merchantId: MERCHANT_ID,
        orderId: 'order-1001',
        completedDate: '2026-08-08T00:00:00Z',
      };
      const result = await client.updateOrder(request);

      expect(result).toEqual(mockOrderResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/merchant/order/update',
        request,
        LIVE_WRITE_CONFIG
      );
    });

    it('should reject a missing orderId', async () => {
      await expect(client.updateOrder({ merchantId: MERCHANT_ID, orderId: '' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });
  });

  describe('refundOrder', () => {
    const mockRefund = {
      connectionId: 'tc-connection',
      createdDate: '2026-08-07T00:00:00Z',
      items: [
        {
          index: 0,
          itemId: 'sku-1001',
          price: 49.99,
          quantity: 1,
          tic: 0,
          tax: { amount: 3.87 },
        },
      ],
    };

    it('should refund an entire order when items are omitted', async () => {
      mockHttpClient.post.mockResolvedValue(mockRefund);

      const request = { merchantId: MERCHANT_ID, orderId: 'order-1001' };
      const result = await client.refundOrder(request);

      expect(result).toEqual(mockRefund);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/merchant/refund/create',
        request,
        LIVE_WRITE_CONFIG
      );
    });

    it('should refund specific items', async () => {
      mockHttpClient.post.mockResolvedValue(mockRefund);

      const request = {
        merchantId: MERCHANT_ID,
        orderId: 'order-1001',
        items: [{ itemId: 'sku-1001', quantity: 1 }],
      };
      await client.refundOrder(request);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/merchant/refund/create',
        request,
        LIVE_WRITE_CONFIG
      );
    });

    it('should reject a missing orderId', async () => {
      await expect(client.refundOrder({ merchantId: MERCHANT_ID, orderId: '' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should reject a refund item with no itemId', async () => {
      await expect(
        client.refundOrder({
          merchantId: MERCHANT_ID,
          orderId: 'order-1001',
          items: [{ itemId: '', quantity: 1 }],
        })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a zero or negative refund quantity', async () => {
      await expect(
        client.refundOrder({
          merchantId: MERCHANT_ID,
          orderId: 'order-1001',
          items: [{ itemId: 'sku-1001', quantity: 0 }],
        })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a non-numeric refund quantity', async () => {
      await expect(
        client.refundOrder({
          merchantId: MERCHANT_ID,
          orderId: 'order-1001',
          items: [{ itemId: 'sku-1001', quantity: 'two' as unknown as number }],
        })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a non-array items value', async () => {
      await expect(
        client.refundOrder({
          merchantId: MERCHANT_ID,
          orderId: 'order-1001',
          items: 'all' as unknown as [],
        })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should accept a fractional refund quantity', async () => {
      mockHttpClient.post.mockResolvedValue(mockRefund);

      await expect(
        client.refundOrder({
          merchantId: MERCHANT_ID,
          orderId: 'order-1001',
          items: [{ itemId: 'sku-1001', quantity: 0.5 }],
        })
      ).resolves.toBeDefined();
    });
  });

  describe('exemption certificates', () => {
    const mockCertificate = {
      certificateId: 'cert-1',
      connectionId: 'tc-connection',
      accountId: 4242,
      customerId: 'customer-453',
      customerName: 'Acme Supply Co',
      customerBusinessType: 'WholesaleTrade',
      reason: 'Resale',
      reasonDescription: 'Resale',
      address: { ...destination, countryCode: 'US' as const },
      states: [{ abbreviation: 'CA' }],
      singlePurchase: false,
      createdDate: '2026-08-07T00:00:00Z',
      disabledAt: null,
    };

    const validCert = {
      merchantId: MERCHANT_ID,
      customerId: 'customer-453',
      customerName: 'Acme Supply Co',
      customerBusinessType: 'WholesaleTrade' as const,
      reason: 'Resale' as const,
      reasonDescription: 'Resale',
      address: destination,
      states: [{ abbreviation: 'CA' }],
    };

    it('should create a certificate', async () => {
      mockHttpClient.post.mockResolvedValue(mockCertificate);

      const result = await client.createExemptionCertificate(validCert);

      expect(result).toEqual(mockCertificate);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/merchant/cert/create',
        validCert,
        LIVE_WRITE_CONFIG
      );
    });

    it('should reject a reasonDescription over 20 characters', async () => {
      await expect(
        client.createExemptionCertificate({ ...validCert, reasonDescription: 'a'.repeat(21) })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject an empty states array', async () => {
      await expect(client.createExemptionCertificate({ ...validCert, states: [] })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should reject a malformed state abbreviation', async () => {
      await expect(
        client.createExemptionCertificate({
          ...validCert,
          states: [{ abbreviation: 'CAL' }],
        })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a missing customerName', async () => {
      await expect(
        client.createExemptionCertificate({ ...validCert, customerName: '' })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a missing address', async () => {
      await expect(
        client.createExemptionCertificate({
          ...validCert,
          address: undefined as unknown as typeof destination,
        })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should get a certificate', async () => {
      mockHttpClient.post.mockResolvedValue(mockCertificate);

      const request = { merchantId: MERCHANT_ID, certificateId: 'cert-1' };
      const result = await client.getExemptionCertificate(request);

      expect(result).toEqual(mockCertificate);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/merchant/cert/get',
        request,
        LIVE_READ_CONFIG
      );
    });

    it('should reject a missing certificateId on get', async () => {
      await expect(
        client.getExemptionCertificate({ merchantId: MERCHANT_ID, certificateId: '' })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should list certificates', async () => {
      const page = { items: [mockCertificate], limit: 20, nextCursor: null };
      mockHttpClient.post.mockResolvedValue(page);

      const request = { merchantId: MERCHANT_ID, customerId: 'customer-453', limit: 20 };
      const result = await client.listExemptionCertificates(request);

      expect(result).toEqual(page);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/merchant/cert/list',
        request,
        LIVE_READ_CONFIG
      );
    });

    it('should reject a limit above 100', async () => {
      await expect(
        client.listExemptionCertificates({ merchantId: MERCHANT_ID, limit: 101 })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a limit below 1', async () => {
      await expect(
        client.listExemptionCertificates({ merchantId: MERCHANT_ID, limit: 0 })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should delete a certificate', async () => {
      mockHttpClient.post.mockResolvedValue(mockCertificate);

      const request = { merchantId: MERCHANT_ID, certificateId: 'cert-1' };
      const result = await client.deleteExemptionCertificate(request);

      expect(result).toEqual(mockCertificate);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/merchant/cert/delete',
        request,
        LIVE_WRITE_CONFIG
      );
    });

    it('should reject a missing certificateId on delete', async () => {
      await expect(
        client.deleteExemptionCertificate({ merchantId: MERCHANT_ID, certificateId: '' })
      ).rejects.toThrow(ZiptaxValidationError);
    });
  });
});
