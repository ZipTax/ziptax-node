/**
 * Tests for ZiptaxClient
 */

import { ZiptaxClient } from '../src/client';
import { ZiptaxValidationError } from '../src/exceptions';
import { HTTPClient } from '../src/utils/http';
import {
  CalculateCartRequest,
  CalculateCartResponse,
  ProductCodeSearchResponse,
  ProductCodeRecommendationResponse,
} from '../src/models';

// Mock the HTTPClient
jest.mock('../src/utils/http');

const mockV60Response = {
  metadata: {
    version: 'v60',
    response: {
      code: 100,
      name: 'RESPONSE_CODE_SUCCESS',
      message: 'Successful API Request.',
      definition: 'http://api.zip-tax.com/request/v60/schema',
    },
  },
  baseRates: [
    {
      rate: 0.06,
      jurType: 'US_STATE_SALES_TAX',
      jurName: 'CA',
      jurDescription: 'US State Sales Tax',
      jurTaxCode: '06',
    },
  ],
  service: {
    adjustmentType: 'SERVICE_TAXABLE',
    taxable: 'N' as const,
    description: 'Services non-taxable',
  },
  shipping: {
    adjustmentType: 'FREIGHT_TAXABLE',
    taxable: 'N' as const,
    description: 'Freight non-taxable',
  },
  sourcingRules: {
    adjustmentType: 'ORIGIN_DESTINATION',
    description: 'Destination Based Taxation',
    value: 'D' as const,
  },
  taxSummaries: [
    {
      rate: 0.0775,
      taxType: 'SALES_TAX',
      summaryName: 'Total Base Sales Tax',
      displayRates: [
        {
          name: 'Total Rate',
          rate: 0.0775,
        },
      ],
    },
  ],
  addressDetail: {
    normalizedAddress: '200 Spectrum Center Dr, Irvine, CA 92618-5003, United States',
    incorporated: 'true' as const,
    geoLat: 33.65253,
    geoLng: -117.74794,
  },
};

const mockPostalCodeResponse = {
  version: 'v60',
  rCode: 100,
  results: [
    {
      geoPostalCode: '92694',
      geoCity: 'LADERA RANCH',
      geoCounty: 'ORANGE',
      geoState: 'CA',
      taxSales: 0.0775,
      taxUse: 0.0775,
      txbService: 'N' as const,
      txbFreight: 'N' as const,
      stateSalesTax: 0.06,
      stateUseTax: 0.06,
      citySalesTax: 0,
      cityUseTax: 0,
      cityTaxCode: '',
      countySalesTax: 0.0025,
      countyUseTax: 0.0025,
      countyTaxCode: '',
      districtSalesTax: 0.015,
      districtUseTax: 0.015,
      district1Code: '37',
      district1SalesTax: 0,
      district1UseTax: 0,
      district2Code: '37',
      district2SalesTax: 0.005,
      district2UseTax: 0.005,
      district3Code: '',
      district3SalesTax: 0,
      district3UseTax: 0,
      district4Code: '30',
      district4SalesTax: 0.01,
      district4UseTax: 0.01,
      district5Code: '',
      district5SalesTax: 0,
      district5UseTax: 0,
      originDestination: 'D' as const,
    },
  ],
  addressDetail: {
    normalizedAddress: 'feature available for geo address lookups only',
    incorporated: 'feature available for geo address lookups only',
    geoLat: 0,
    geoLng: 0,
  },
};

const mockAccountMetrics = {
  request_count: 15595,
  request_limit: 1000000,
  usage_percent: 1.5595,
  is_active: true,
  message: 'Contact support@zip.tax to modify your account',
};

describe('ZiptaxClient', () => {
  let mockHttpClient: jest.Mocked<HTTPClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
    } as unknown as jest.Mocked<HTTPClient>;
    (HTTPClient as jest.MockedClass<typeof HTTPClient>).mockImplementation(() => mockHttpClient);
  });

  describe('constructor', () => {
    it('should create client with valid API key', () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      expect(client).toBeInstanceOf(ZiptaxClient);
    });

    it('should throw error for missing API key', () => {
      expect(() => new ZiptaxClient({ apiKey: '' })).toThrow(ZiptaxValidationError);
    });

    it('should use default configuration', () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const config = client.getConfig();
      expect(config.baseURL).toBe('https://api.zip-tax.com');
      expect(config.timeout).toBe(30000);
    });

    it('should accept custom configuration', () => {
      const client = new ZiptaxClient({
        apiKey: 'test-api-key',
        baseURL: 'https://custom.api.com',
        timeout: 5000,
      });
      const config = client.getConfig();
      expect(config.baseURL).toBe('https://custom.api.com');
      expect(config.timeout).toBe(5000);
    });
  });

  describe('getSalesTaxByAddress', () => {
    it('should get tax rates by address', async () => {
      mockHttpClient.get.mockResolvedValue(mockV60Response);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.getSalesTaxByAddress({
        address: '200 Spectrum Center Drive, Irvine, CA 92618',
      });

      expect(result).toEqual(mockV60Response);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/request/v60/', {
        params: {
          address: '200 Spectrum Center Drive, Irvine, CA 92618',
          taxabilityCode: undefined,
          countryCode: 'USA',
          historical: undefined,
          format: 'json',
        },
      });
    });

    it('should throw error for missing address', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.getSalesTaxByAddress({ address: '' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should validate address max length', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const longAddress = 'a'.repeat(101);
      await expect(client.getSalesTaxByAddress({ address: longAddress })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should validate taxability code format', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(
        client.getSalesTaxByAddress({
          address: '200 Spectrum Center Drive',
          taxabilityCode: 'invalid',
        })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should validate historical date format (YYYYMM)', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      // Reject YYYY-MM (with dash)
      await expect(
        client.getSalesTaxByAddress({
          address: '200 Spectrum Center Drive',
          historical: '2024-01',
        })
      ).rejects.toThrow(ZiptaxValidationError);
      // Reject arbitrary string
      await expect(
        client.getSalesTaxByAddress({
          address: '200 Spectrum Center Drive',
          historical: '2024-1-1',
        })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should accept valid YYYYMM historical date', async () => {
      mockHttpClient.get.mockResolvedValue(mockV60Response);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const result = await client.getSalesTaxByAddress({
        address: '200 Spectrum Center Drive',
        historical: '202401',
      });
      expect(result).toEqual(mockV60Response);
    });
  });

  describe('getSalesTaxByGeoLocation', () => {
    it('should get tax rates by geolocation', async () => {
      mockHttpClient.get.mockResolvedValue(mockV60Response);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.getSalesTaxByGeoLocation({
        lat: '33.65253',
        lng: '-117.74794',
      });

      expect(result).toEqual(mockV60Response);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/request/v60/', {
        params: {
          lat: '33.65253',
          lng: '-117.74794',
          countryCode: 'USA',
          historical: undefined,
          format: 'json',
        },
      });
    });

    it('should throw error for missing lat', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.getSalesTaxByGeoLocation({ lat: '', lng: '-117.74794' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should throw error for missing lng', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.getSalesTaxByGeoLocation({ lat: '33.65253', lng: '' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });
  });

  describe('getRatesByPostalCode', () => {
    it('should get tax rates by postal code', async () => {
      mockHttpClient.get.mockResolvedValue(mockPostalCodeResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.getRatesByPostalCode({
        postalcode: '92694',
      });

      expect(result).toEqual(mockPostalCodeResponse);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/request/v60/', {
        params: {
          postalcode: '92694',
          format: 'json',
        },
      });
    });

    it('should throw error for missing postal code', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.getRatesByPostalCode({ postalcode: '' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should validate postal code format (must be 5 digits)', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.getRatesByPostalCode({ postalcode: '1234' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should validate postal code format (must be numeric)', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.getRatesByPostalCode({ postalcode: 'ABCDE' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should validate postal code max length', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.getRatesByPostalCode({ postalcode: '123456' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should accept format parameter', async () => {
      mockHttpClient.get.mockResolvedValue(mockPostalCodeResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      await client.getRatesByPostalCode({ postalcode: '92694', format: 'xml' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/request/v60/', {
        params: {
          postalcode: '92694',
          format: 'xml',
        },
      });
    });
  });

  describe('getAccountMetrics', () => {
    it('should get account metrics', async () => {
      mockHttpClient.get.mockResolvedValue(mockAccountMetrics);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.getAccountMetrics();

      expect(result).toEqual(mockAccountMetrics);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/account/v60/metrics', {
        params: undefined,
      });
    });

    it('should accept format parameter', async () => {
      mockHttpClient.get.mockResolvedValue(mockAccountMetrics);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      await client.getAccountMetrics({ format: 'xml' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/account/v60/metrics', {
        params: {
          format: 'xml',
        },
      });
    });
  });

  describe('searchProductCodes', () => {
    const mockSearchResponse: ProductCodeSearchResponse = {
      query: 'baked goods sold in plastic packaging',
      results: [
        {
          ticId: '41030',
          label: 'Bakery Items',
          naturalLabel: 'Bakery Items',
          description: 'Bakery items sold without eating utensils provided by the seller',
          documentation:
            'Bakery items sold without eating utensils provided by the seller, not sold as a prepared food',
          rank: '1',
          score: '0.891025641025641',
        },
        {
          ticId: '40030',
          label: 'Food and Food Ingredients',
          naturalLabel: 'Food and Food Ingredients',
          description: 'Food and food ingredients for human consumption',
          documentation:
            'Food and food ingredients for human consumption that are not candy, dietary supplements, or soft drinks',
          rank: '2',
          score: '0.750512820512821',
        },
      ],
    };

    it('should search product codes with valid query', async () => {
      mockHttpClient.post.mockResolvedValue(mockSearchResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.searchProductCodes('baked goods sold in plastic packaging');

      expect(result).toEqual(mockSearchResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/search/tic', {
        query: 'baked goods sold in plastic packaging',
      });
    });

    it('should POST to /search/tic', async () => {
      mockHttpClient.post.mockResolvedValue(mockSearchResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      await client.searchProductCodes('test query');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/search/tic', {
        query: 'test query',
      });
    });

    it('should return correct response structure with multiple results', async () => {
      mockHttpClient.post.mockResolvedValue(mockSearchResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.searchProductCodes('baked goods');

      expect(result.query).toBe('baked goods sold in plastic packaging');
      expect(result.results).toHaveLength(2);
      expect(result.results[0].ticId).toBe('41030');
      expect(result.results[0].label).toBe('Bakery Items');
      expect(result.results[0].naturalLabel).toBe('Bakery Items');
      expect(result.results[0].description).toContain('Bakery items');
      expect(result.results[0].documentation).toContain('Bakery items');
      expect(result.results[0].rank).toBe('1');
      expect(result.results[0].score).toBe('0.891025641025641');
      expect(result.results[1].ticId).toBe('40030');
      expect(result.results[1].rank).toBe('2');
    });

    it('should handle empty results list', async () => {
      const emptyResponse: ProductCodeSearchResponse = {
        query: 'nonexistent product',
        results: [],
      };
      mockHttpClient.post.mockResolvedValue(emptyResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.searchProductCodes('nonexistent product');

      expect(result.results).toHaveLength(0);
    });

    it('should throw error for empty query', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.searchProductCodes('')).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for whitespace-only query', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.searchProductCodes('   ')).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for query exceeding 500 characters', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const longQuery = 'a'.repeat(501);
      await expect(client.searchProductCodes(longQuery)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should accept query at exactly 500 characters', async () => {
      mockHttpClient.post.mockResolvedValue(mockSearchResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const query = 'a'.repeat(500);
      await expect(client.searchProductCodes(query)).resolves.toBeDefined();
    });
  });

  describe('recommendProductCode', () => {
    const mockRecommendResponse: ProductCodeRecommendationResponse = {
      predictions: [
        {
          status: 'success',
          error: null,
          ticId: '41030',
          label: 'Bakery Items',
          naturalLabel: 'Bakery Items',
          tic_description: 'Bakery items sold without eating utensils provided by the seller',
          product_description: 'baked goods sold in plastic packaging',
        },
      ],
    };

    it('should recommend product code with valid query', async () => {
      mockHttpClient.post.mockResolvedValue(mockRecommendResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.recommendProductCode('baked goods sold in plastic packaging');

      expect(result).toEqual(mockRecommendResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/search/tic/recommend', {
        query: 'baked goods sold in plastic packaging',
      });
    });

    it('should POST to /search/tic/recommend', async () => {
      mockHttpClient.post.mockResolvedValue(mockRecommendResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      await client.recommendProductCode('test query');

      expect(mockHttpClient.post).toHaveBeenCalledWith('/search/tic/recommend', {
        query: 'test query',
      });
    });

    it('should return correct response structure', async () => {
      mockHttpClient.post.mockResolvedValue(mockRecommendResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.recommendProductCode('baked goods');

      expect(result.predictions).toHaveLength(1);
      const prediction = result.predictions[0];
      expect(prediction.status).toBe('success');
      expect(prediction.error).toBeNull();
      expect(prediction.ticId).toBe('41030');
      expect(prediction.label).toBe('Bakery Items');
      expect(prediction.naturalLabel).toBe('Bakery Items');
      expect(prediction.tic_description).toContain('Bakery items');
      expect(prediction.product_description).toBe('baked goods sold in plastic packaging');
    });

    it('should handle prediction with error status', async () => {
      const errorResponse: ProductCodeRecommendationResponse = {
        predictions: [
          {
            status: 'fail',
            error: 'Unable to determine product code',
            ticId: '',
            label: '',
            naturalLabel: '',
            tic_description: '',
            product_description: 'some vague description',
          },
        ],
      };
      mockHttpClient.post.mockResolvedValue(errorResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.recommendProductCode('some vague description');

      expect(result.predictions[0].status).toBe('fail');
      expect(result.predictions[0].error).toBe('Unable to determine product code');
    });

    it('should throw error for empty query', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.recommendProductCode('')).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for whitespace-only query', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.recommendProductCode('  \t\n  ')).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for query exceeding 500 characters', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const longQuery = 'a'.repeat(501);
      await expect(client.recommendProductCode(longQuery)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should accept query at exactly 500 characters', async () => {
      mockHttpClient.post.mockResolvedValue(mockRecommendResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const query = 'a'.repeat(500);
      await expect(client.recommendProductCode(query)).resolves.toBeDefined();
    });
  });

  describe('calculateCart', () => {
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
              taxabilityCode: 0,
            },
            {
              itemId: 'item-2',
              price: 25.0,
              quantity: 2.0,
            },
          ],
        },
      ],
    };

    const mockCartResponse: CalculateCartResponse = {
      items: [
        {
          cartId: 'ce4a1234-5678-90ab-cdef-1234567890ab',
          customerId: 'customer-453',
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
              tax: { rate: 0.09025, amount: 1.45528 },
            },
            {
              itemId: 'item-2',
              price: 25.0,
              quantity: 2.0,
              tax: { rate: 0.09025, amount: 4.5125 },
            },
          ],
        },
      ],
    };

    it('should calculate cart tax via ZipTax API', async () => {
      mockHttpClient.post.mockResolvedValue(mockCartResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.calculateCart(validCartRequest);

      expect(result).toEqual(mockCartResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/calculate/cart', validCartRequest);
    });

    it('should return correct response structure', async () => {
      mockHttpClient.post.mockResolvedValue(mockCartResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = (await client.calculateCart(validCartRequest)) as CalculateCartResponse;

      expect(result.items).toHaveLength(1);
      expect(result.items[0].cartId).toBe('ce4a1234-5678-90ab-cdef-1234567890ab');
      expect(result.items[0].customerId).toBe('customer-453');
      expect(result.items[0].lineItems).toHaveLength(2);
      expect(result.items[0].lineItems[0].tax.rate).toBe(0.09025);
      expect(result.items[0].lineItems[0].tax.amount).toBe(1.45528);
    });

    it('should throw error when items array is empty', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.calculateCart({ items: [] })).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error when items array has more than 1 element', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [{ ...validCartRequest.items[0] }, { ...validCartRequest.items[0] }],
      };
      await expect(client.calculateCart(request)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for missing customerId', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            customerId: '',
          },
        ],
      };
      await expect(client.calculateCart(request)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should accept CAD currency code', async () => {
      mockHttpClient.post.mockResolvedValue({ items: [] });
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            currency: { currencyCode: 'CAD' },
          },
        ],
      };
      await expect(client.calculateCart(request)).resolves.toBeDefined();
    });

    it('should throw error for invalid currency code', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request = {
        items: [
          {
            ...validCartRequest.items[0],
            currency: { currencyCode: 'EUR' },
          },
        ],
      } as unknown as CalculateCartRequest;
      await expect(client.calculateCart(request)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for missing destination address', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            destination: { address: '' },
          },
        ],
      };
      await expect(client.calculateCart(request)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for missing origin address', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            origin: { address: '' },
          },
        ],
      };
      await expect(client.calculateCart(request)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for empty lineItems', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            lineItems: [],
          },
        ],
      };
      await expect(client.calculateCart(request)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error when lineItems exceeds 250', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const manyItems = Array.from({ length: 251 }, (_, i) => ({
        itemId: `item-${i}`,
        price: 10.0,
        quantity: 1.0,
      }));
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            lineItems: manyItems,
          },
        ],
      };
      await expect(client.calculateCart(request)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for missing lineItem itemId', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            lineItems: [{ itemId: '', price: 10.0, quantity: 1.0 }],
          },
        ],
      };
      await expect(client.calculateCart(request)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for zero price', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            lineItems: [{ itemId: 'item-1', price: 0, quantity: 1.0 }],
          },
        ],
      };
      await expect(client.calculateCart(request)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for negative price', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            lineItems: [{ itemId: 'item-1', price: -5.0, quantity: 1.0 }],
          },
        ],
      };
      await expect(client.calculateCart(request)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for zero quantity', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            lineItems: [{ itemId: 'item-1', price: 10.0, quantity: 0 }],
          },
        ],
      };
      await expect(client.calculateCart(request)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for negative quantity', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            lineItems: [{ itemId: 'item-1', price: 10.0, quantity: -1.0 }],
          },
        ],
      };
      await expect(client.calculateCart(request)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for NaN price', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            lineItems: [{ itemId: 'item-1', price: NaN, quantity: 1.0 }],
          },
        ],
      };
      await expect(client.calculateCart(request)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for Infinity price', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            lineItems: [{ itemId: 'item-1', price: Infinity, quantity: 1.0 }],
          },
        ],
      };
      await expect(client.calculateCart(request)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for NaN quantity', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            lineItems: [{ itemId: 'item-1', price: 10.0, quantity: NaN }],
          },
        ],
      };
      await expect(client.calculateCart(request)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for Infinity quantity', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            lineItems: [{ itemId: 'item-1', price: 10.0, quantity: Infinity }],
          },
        ],
      };
      await expect(client.calculateCart(request)).rejects.toThrow(ZiptaxValidationError);
    });

    it('should accept fractional quantity', async () => {
      mockHttpClient.post.mockResolvedValue(mockCartResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            lineItems: [{ itemId: 'item-1', price: 10.0, quantity: 0.5 }],
          },
        ],
      };
      const result = await client.calculateCart(request);
      expect(result).toEqual(mockCartResponse);
    });

    it('should accept optional taxabilityCode on line items', async () => {
      mockHttpClient.post.mockResolvedValue(mockCartResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      const request: CalculateCartRequest = {
        items: [
          {
            ...validCartRequest.items[0],
            lineItems: [
              {
                itemId: 'item-1',
                price: 10.0,
                quantity: 1.0,
                taxabilityCode: 0,
              },
              {
                itemId: 'item-2',
                price: 20.0,
                quantity: 1.0,
                // No taxabilityCode - should be accepted
              },
            ],
          },
        ],
      };
      const result = await client.calculateCart(request);
      expect(result).toEqual(mockCartResponse);
    });
  });
});
