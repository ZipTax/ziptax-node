/**
 * Tests for TaxCloud order management functions
 */

import { ZiptaxClient } from '../src/client';
import { ZiptaxConfigurationError } from '../src/exceptions';
import { HTTPClient } from '../src/utils/http';
import {
  CreateOrderRequest,
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
});
