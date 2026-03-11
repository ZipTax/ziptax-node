/**
 * Tests for TaxCloud order management functions
 */

import { ZiptaxClient } from '../src/client';
import { ZiptaxConfigurationError, ZiptaxValidationError } from '../src/exceptions';
import { HTTPClient } from '../src/utils/http';
import {
  CalculateCartRequest,
  TaxCloudCalculateCartResponse,
  CreateOrderRequest,
  CreateOrderFromCartRequest,
  OrderResponse,
  UpdateOrderRequest,
  RefundTransactionRequest,
  RefundTransactionResponse,
} from '../src/models';

// Mock the HTTPClient
jest.mock('../src/utils/http');

const mockOrderResponse: OrderResponse = {
  orderId: 'test-order-123',
  customerId: 'customer-456',
  connectionId: '25eb9b97-5acb-492d-b720-c03e79cf715a',
  transactionDate: '2024-01-15T09:30:00Z',
  completedDate: '2024-01-15T09:30:00Z',
  origin: {
    line1: '323 Washington Ave N',
    city: 'Minneapolis',
    state: 'MN',
    zip: '55401-2427',
    countryCode: 'US',
  },
  destination: {
    line1: '323 Washington Ave N',
    city: 'Minneapolis',
    state: 'MN',
    zip: '55401-2427',
    countryCode: 'US',
  },
  lineItems: [
    {
      index: 0,
      itemId: 'item-1',
      price: 10.8,
      quantity: 1.5,
      tax: {
        amount: 1.31,
        rate: 0.0813,
      },
      tic: 0,
    },
  ],
  currency: {
    currencyCode: 'USD',
  },
  channel: null,
  deliveredBySeller: false,
  excludeFromFiling: false,
  exemption: {
    exemptionId: null,
    isExempt: null,
  },
};

const mockRefundResponse: RefundTransactionResponse[] = [
  {
    connectionId: '25eb9b97-5acb-492d-b720-c03e79cf715a',
    createdDate: '2024-01-17T14:30:00Z',
    items: [
      {
        index: 0,
        itemId: 'item-1',
        price: 10.8,
        quantity: 1.0,
        tax: {
          amount: 0.87,
        },
        tic: 0,
      },
    ],
    returnedDate: '2024-01-17T14:30:00Z',
  },
];

describe('ZiptaxClient - TaxCloud Orders', () => {
  let client: ZiptaxClient;
  let mockHttpClient: jest.Mocked<HTTPClient>;
  let mockTaxCloudHttpClient: jest.Mocked<HTTPClient>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock HTTP clients
    mockHttpClient = new HTTPClient({
      baseURL: 'https://api.zip-tax.com',
      apiKey: 'test-key',
    }) as jest.Mocked<HTTPClient>;

    mockTaxCloudHttpClient = new HTTPClient({
      baseURL: 'https://api.v3.taxcloud.com',
      apiKey: 'test-taxcloud-key',
    }) as jest.Mocked<HTTPClient>;

    // Mock the HTTPClient constructor to return our mocks
    (HTTPClient as jest.MockedClass<typeof HTTPClient>).mockImplementation((config) => {
      if (config.baseURL.includes('taxcloud')) {
        return mockTaxCloudHttpClient;
      }
      return mockHttpClient;
    });

    // Initialize client with TaxCloud credentials
    client = new ZiptaxClient({
      apiKey: 'test-api-key',
      taxCloudConnectionId: '25eb9b97-5acb-492d-b720-c03e79cf715a',
      taxCloudAPIKey: 'test-taxcloud-key',
    });
  });

  describe('createOrder', () => {
    it('should create a new order successfully', async () => {
      const createRequest: CreateOrderRequest = {
        orderId: 'test-order-123',
        customerId: 'customer-456',
        transactionDate: '2024-01-15T09:30:00Z',
        completedDate: '2024-01-15T09:30:00Z',
        origin: {
          line1: '323 Washington Ave N',
          city: 'Minneapolis',
          state: 'MN',
          zip: '55401-2427',
        },
        destination: {
          line1: '323 Washington Ave N',
          city: 'Minneapolis',
          state: 'MN',
          zip: '55401-2427',
        },
        lineItems: [
          {
            index: 0,
            itemId: 'item-1',
            price: 10.8,
            quantity: 1.5,
            tax: {
              amount: 1.31,
              rate: 0.0813,
            },
            tic: 0,
          },
        ],
        currency: {
          currencyCode: 'USD',
        },
      };

      mockTaxCloudHttpClient.post = jest.fn().mockResolvedValue(mockOrderResponse);

      const result = await client.createOrder(createRequest);

      expect(result).toEqual(mockOrderResponse);
      expect(mockTaxCloudHttpClient.post).toHaveBeenCalledWith(
        '/tax/connections/25eb9b97-5acb-492d-b720-c03e79cf715a/orders',
        createRequest
      );
    });

    it('should throw ZiptaxConfigurationError when TaxCloud credentials are not configured', async () => {
      const clientWithoutTaxCloud = new ZiptaxClient({
        apiKey: 'test-api-key',
      });

      const createRequest: CreateOrderRequest = {
        orderId: 'test-order-123',
        customerId: 'customer-456',
        transactionDate: '2024-01-15T09:30:00Z',
        completedDate: '2024-01-15T09:30:00Z',
        origin: {
          line1: '323 Washington Ave N',
          city: 'Minneapolis',
          state: 'MN',
          zip: '55401-2427',
        },
        destination: {
          line1: '323 Washington Ave N',
          city: 'Minneapolis',
          state: 'MN',
          zip: '55401-2427',
        },
        lineItems: [],
        currency: { currencyCode: 'USD' },
      };

      await expect(clientWithoutTaxCloud.createOrder(createRequest)).rejects.toThrow(
        ZiptaxConfigurationError
      );
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        orderId: '',
        customerId: 'customer-456',
        transactionDate: '2024-01-15T09:30:00Z',
        completedDate: '2024-01-15T09:30:00Z',
        origin: {
          line1: '323 Washington Ave N',
          city: 'Minneapolis',
          state: 'MN',
          zip: '55401-2427',
        },
        destination: {
          line1: '323 Washington Ave N',
          city: 'Minneapolis',
          state: 'MN',
          zip: '55401-2427',
        },
        lineItems: [],
        currency: { currencyCode: 'USD' },
      } as CreateOrderRequest;

      await expect(client.createOrder(invalidRequest)).rejects.toThrow();
    });
  });

  describe('getOrder', () => {
    it('should retrieve an order by ID', async () => {
      mockTaxCloudHttpClient.get = jest.fn().mockResolvedValue(mockOrderResponse);

      const result = await client.getOrder('test-order-123');

      expect(result).toEqual(mockOrderResponse);
      expect(mockTaxCloudHttpClient.get).toHaveBeenCalledWith(
        '/tax/connections/25eb9b97-5acb-492d-b720-c03e79cf715a/orders/test-order-123'
      );
    });

    it('should throw ZiptaxConfigurationError when TaxCloud credentials are not configured', async () => {
      const clientWithoutTaxCloud = new ZiptaxClient({
        apiKey: 'test-api-key',
      });

      await expect(clientWithoutTaxCloud.getOrder('test-order-123')).rejects.toThrow(
        ZiptaxConfigurationError
      );
    });

    it('should validate orderId is provided', async () => {
      await expect(client.getOrder('')).rejects.toThrow();
    });
  });

  describe('updateOrder', () => {
    it('should update an order successfully', async () => {
      const updateRequest: UpdateOrderRequest = {
        completedDate: '2024-01-16T10:00:00Z',
      };

      const updatedResponse = {
        ...mockOrderResponse,
        completedDate: '2024-01-16T10:00:00Z',
      };

      mockTaxCloudHttpClient.patch = jest.fn().mockResolvedValue(updatedResponse);

      const result = await client.updateOrder('test-order-123', updateRequest);

      expect(result).toEqual(updatedResponse);
      expect(mockTaxCloudHttpClient.patch).toHaveBeenCalledWith(
        '/tax/connections/25eb9b97-5acb-492d-b720-c03e79cf715a/orders/test-order-123',
        updateRequest
      );
    });

    it('should throw ZiptaxConfigurationError when TaxCloud credentials are not configured', async () => {
      const clientWithoutTaxCloud = new ZiptaxClient({
        apiKey: 'test-api-key',
      });

      const updateRequest: UpdateOrderRequest = {
        completedDate: '2024-01-16T10:00:00Z',
      };

      await expect(
        clientWithoutTaxCloud.updateOrder('test-order-123', updateRequest)
      ).rejects.toThrow(ZiptaxConfigurationError);
    });

    it('should validate required fields', async () => {
      await expect(
        client.updateOrder('', { completedDate: '2024-01-16T10:00:00Z' })
      ).rejects.toThrow();
      await expect(client.updateOrder('test-order-123', { completedDate: '' })).rejects.toThrow();
    });
  });

  describe('refundOrder', () => {
    it('should refund an order successfully', async () => {
      const refundRequest: RefundTransactionRequest = {
        items: [
          {
            itemId: 'item-1',
            quantity: 1.0,
          },
        ],
      };

      mockTaxCloudHttpClient.post = jest.fn().mockResolvedValue(mockRefundResponse);

      const result = await client.refundOrder('test-order-123', refundRequest);

      expect(result).toEqual(mockRefundResponse);
      expect(mockTaxCloudHttpClient.post).toHaveBeenCalledWith(
        '/tax/connections/25eb9b97-5acb-492d-b720-c03e79cf715a/orders/refunds/test-order-123',
        refundRequest
      );
    });

    it('should throw ZiptaxConfigurationError when TaxCloud credentials are not configured', async () => {
      const clientWithoutTaxCloud = new ZiptaxClient({
        apiKey: 'test-api-key',
      });

      const refundRequest: RefundTransactionRequest = {
        items: [{ itemId: 'item-1', quantity: 1.0 }],
      };

      await expect(
        clientWithoutTaxCloud.refundOrder('test-order-123', refundRequest)
      ).rejects.toThrow(ZiptaxConfigurationError);
    });

    it('should allow full refund without items (empty or omitted)', async () => {
      mockTaxCloudHttpClient.post = jest.fn().mockResolvedValue(mockRefundResponse);

      // Full refund with no request body
      const result = await client.refundOrder('test-order-123');

      expect(result).toEqual(mockRefundResponse);
      expect(mockTaxCloudHttpClient.post).toHaveBeenCalledWith(
        '/tax/connections/25eb9b97-5acb-492d-b720-c03e79cf715a/orders/refunds/test-order-123',
        {}
      );
    });

    it('should validate orderId is provided', async () => {
      const refundRequest: RefundTransactionRequest = {
        items: [{ itemId: 'item-1', quantity: 1.0 }],
      };

      await expect(client.refundOrder('', refundRequest)).rejects.toThrow();
    });
  });

  describe('createOrderFromCart', () => {
    it('should create an order from a cart successfully', async () => {
      const request: CreateOrderFromCartRequest = {
        cartId: 'ce4a1234-5678-90ab-cdef-1234567890ab',
        orderId: 'my-order-1',
      };

      mockTaxCloudHttpClient.post = jest.fn().mockResolvedValue(mockOrderResponse);

      const result = await client.createOrderFromCart(request);

      expect(result).toEqual(mockOrderResponse);
      expect(mockTaxCloudHttpClient.post).toHaveBeenCalledWith(
        '/tax/connections/25eb9b97-5acb-492d-b720-c03e79cf715a/carts/orders',
        request
      );
    });

    it('should throw ZiptaxConfigurationError when TaxCloud credentials are not configured', async () => {
      const clientWithoutTaxCloud = new ZiptaxClient({
        apiKey: 'test-api-key',
      });

      const request: CreateOrderFromCartRequest = {
        cartId: 'ce4a1234-5678-90ab-cdef-1234567890ab',
        orderId: 'my-order-1',
      };

      await expect(clientWithoutTaxCloud.createOrderFromCart(request)).rejects.toThrow(
        ZiptaxConfigurationError
      );
    });

    it('should validate cartId is required', async () => {
      const request = {
        cartId: '',
        orderId: 'my-order-1',
      } as CreateOrderFromCartRequest;

      await expect(client.createOrderFromCart(request)).rejects.toThrow();
    });

    it('should validate orderId is required', async () => {
      const request = {
        cartId: 'ce4a1234-5678-90ab-cdef-1234567890ab',
        orderId: '',
      } as CreateOrderFromCartRequest;

      await expect(client.createOrderFromCart(request)).rejects.toThrow();
    });
  });

  describe('getConfig', () => {
    it('should return configuration including TaxCloud credentials', () => {
      const config = client.getConfig();

      expect(config).toMatchObject({
        apiKey: 'test-api-key',
        taxCloudConnectionId: '25eb9b97-5acb-492d-b720-c03e79cf715a',
        taxCloudAPIKey: 'test-taxcloud-key',
      });
    });
  });

  describe('calculateCart - TaxCloud routing', () => {
    const validCartRequest: CalculateCartRequest = {
      items: [
        {
          customerId: 'customer-453',
          currency: { currencyCode: 'USD' },
          destination: {
            address: '200 Spectrum Center Dr, Irvine, CA 92618-1905',
          },
          origin: {
            address: '323 Washington Ave N, Minneapolis, MN 55401-2427',
          },
          lineItems: [
            {
              itemId: 'item-1',
              price: 10.75,
              quantity: 1.5,
            },
            {
              itemId: 'item-2',
              price: 25.0,
              quantity: 2.0,
              taxabilityCode: 0,
            },
          ],
        },
      ],
    };

    const mockTaxCloudCartResponse: TaxCloudCalculateCartResponse = {
      connectionId: '25eb9b97-5acb-492d-b720-c03e79cf715a',
      items: [
        {
          cartId: 'ce4a1234-5678-90ab-cdef-1234567890ab',
          customerId: 'customer-453',
          currency: { currencyCode: 'USD' },
          deliveredBySeller: false,
          destination: {
            line1: '200 Spectrum Center Dr',
            city: 'Irvine',
            state: 'CA',
            zip: '92618-1905',
            countryCode: 'US',
          },
          origin: {
            line1: '323 Washington Ave N',
            city: 'Minneapolis',
            state: 'MN',
            zip: '55401-2427',
            countryCode: 'US',
          },
          exemption: {
            exemptionId: null,
            isExempt: null,
          },
          lineItems: [
            {
              index: 0,
              itemId: 'item-1',
              price: 10.75,
              quantity: 1.5,
              tax: { amount: 1.46, rate: 0.0903 },
              tic: 0,
            },
            {
              index: 1,
              itemId: 'item-2',
              price: 25.0,
              quantity: 2.0,
              tax: { amount: 4.52, rate: 0.0903 },
              tic: 0,
            },
          ],
        },
      ],
      transactionDate: '2024-01-15T09:30:00Z',
    };

    it('should route to TaxCloud when credentials are configured', async () => {
      mockTaxCloudHttpClient.post = jest.fn().mockResolvedValue(mockTaxCloudCartResponse);

      const result = await client.calculateCart(validCartRequest);

      expect(result).toEqual(mockTaxCloudCartResponse);
      // Should use TaxCloud HTTP client, not ZipTax
      expect(mockTaxCloudHttpClient.post).toHaveBeenCalled();
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it('should POST to correct TaxCloud path', async () => {
      mockTaxCloudHttpClient.post = jest.fn().mockResolvedValue(mockTaxCloudCartResponse);

      await client.calculateCart(validCartRequest);

      expect(mockTaxCloudHttpClient.post).toHaveBeenCalledWith(
        '/tax/connections/25eb9b97-5acb-492d-b720-c03e79cf715a/carts',
        expect.any(Object)
      );
    });

    it('should transform destination address to structured format', async () => {
      mockTaxCloudHttpClient.post = jest.fn().mockResolvedValue(mockTaxCloudCartResponse);

      await client.calculateCart(validCartRequest);

      const callArgs = mockTaxCloudHttpClient.post.mock.calls[0];
      const body = callArgs[1] as Record<string, unknown>;
      const items = body.items as Record<string, unknown>[];
      const dest = items[0].destination as Record<string, string>;

      expect(dest.line1).toBe('200 Spectrum Center Dr');
      expect(dest.city).toBe('Irvine');
      expect(dest.state).toBe('CA');
      expect(dest.zip).toBe('92618-1905');
      expect(dest.countryCode).toBe('US');
    });

    it('should transform origin address to structured format', async () => {
      mockTaxCloudHttpClient.post = jest.fn().mockResolvedValue(mockTaxCloudCartResponse);

      await client.calculateCart(validCartRequest);

      const callArgs = mockTaxCloudHttpClient.post.mock.calls[0];
      const body = callArgs[1] as Record<string, unknown>;
      const items = body.items as Record<string, unknown>[];
      const origin = items[0].origin as Record<string, string>;

      expect(origin.line1).toBe('323 Washington Ave N');
      expect(origin.city).toBe('Minneapolis');
      expect(origin.state).toBe('MN');
      expect(origin.zip).toBe('55401-2427');
      expect(origin.countryCode).toBe('US');
    });

    it('should map taxabilityCode to tic field (defaults to 0)', async () => {
      mockTaxCloudHttpClient.post = jest.fn().mockResolvedValue(mockTaxCloudCartResponse);

      await client.calculateCart(validCartRequest);

      const callArgs = mockTaxCloudHttpClient.post.mock.calls[0];
      const body = callArgs[1] as Record<string, unknown>;
      const items = body.items as Record<string, unknown>[];
      const lineItems = items[0].lineItems as Record<string, unknown>[];

      // item-1 has no taxabilityCode -> tic defaults to 0
      expect(lineItems[0].tic).toBe(0);
      // item-2 has taxabilityCode=0 -> tic is 0
      expect(lineItems[1].tic).toBe(0);
    });

    it('should add 0-based index to line items', async () => {
      mockTaxCloudHttpClient.post = jest.fn().mockResolvedValue(mockTaxCloudCartResponse);

      await client.calculateCart(validCartRequest);

      const callArgs = mockTaxCloudHttpClient.post.mock.calls[0];
      const body = callArgs[1] as Record<string, unknown>;
      const items = body.items as Record<string, unknown>[];
      const lineItems = items[0].lineItems as Record<string, unknown>[];

      expect(lineItems[0].index).toBe(0);
      expect(lineItems[1].index).toBe(1);
    });

    it('should pass through currency code', async () => {
      mockTaxCloudHttpClient.post = jest.fn().mockResolvedValue(mockTaxCloudCartResponse);

      await client.calculateCart(validCartRequest);

      const callArgs = mockTaxCloudHttpClient.post.mock.calls[0];
      const body = callArgs[1] as Record<string, unknown>;
      const items = body.items as Record<string, unknown>[];
      const currency = items[0].currency as Record<string, string>;

      expect(currency.currencyCode).toBe('USD');
    });

    it('should pass through customerId', async () => {
      mockTaxCloudHttpClient.post = jest.fn().mockResolvedValue(mockTaxCloudCartResponse);

      await client.calculateCart(validCartRequest);

      const callArgs = mockTaxCloudHttpClient.post.mock.calls[0];
      const body = callArgs[1] as Record<string, unknown>;
      const items = body.items as Record<string, unknown>[];

      expect(items[0].customerId).toBe('customer-453');
    });

    it('should throw validation error for unparseable address', async () => {
      const badRequest: CalculateCartRequest = {
        items: [
          {
            customerId: 'customer-453',
            currency: { currencyCode: 'USD' },
            destination: { address: 'bad address' },
            origin: {
              address: '323 Washington Ave N, Minneapolis, MN 55401-2427',
            },
            lineItems: [{ itemId: 'item-1', price: 10.0, quantity: 1.0 }],
          },
        ],
      };

      await expect(client.calculateCart(badRequest)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should route to ZipTax when TaxCloud is not configured', async () => {
      const clientWithoutTaxCloud = new ZiptaxClient({
        apiKey: 'test-api-key',
      });

      // Reset the mock for the ZipTax HTTP client
      mockHttpClient.post = jest.fn().mockResolvedValue({
        items: [
          {
            cartId: 'test-cart-id',
            customerId: 'customer-453',
            destination: { address: 'test' },
            origin: { address: 'test' },
            lineItems: [],
          },
        ],
      });

      await clientWithoutTaxCloud.calculateCart(validCartRequest);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/calculate/cart', validCartRequest);
    });

    it('should return TaxCloudCalculateCartResponse structure', async () => {
      mockTaxCloudHttpClient.post = jest.fn().mockResolvedValue(mockTaxCloudCartResponse);

      const result = (await client.calculateCart(
        validCartRequest
      )) as TaxCloudCalculateCartResponse;

      expect(result.connectionId).toBe('25eb9b97-5acb-492d-b720-c03e79cf715a');
      expect(result.transactionDate).toBe('2024-01-15T09:30:00Z');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].cartId).toBe('ce4a1234-5678-90ab-cdef-1234567890ab');
      expect(result.items[0].deliveredBySeller).toBe(false);
      expect(result.items[0].exemption.exemptionId).toBeNull();
      expect(result.items[0].lineItems).toHaveLength(2);
      expect(result.items[0].lineItems[0].tic).toBe(0);
    });
  });
});
