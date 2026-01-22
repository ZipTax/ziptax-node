/**
 * Tests for ZiptaxClient
 */

import { ZiptaxClient } from '../src/client';
import { ZiptaxValidationError } from '../src/exceptions';
import { HTTPClient } from '../src/utils/http';

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

const mockAccountMetrics = {
  core_request_count: 15595,
  core_request_limit: 1000000,
  core_usage_percent: 1.5595,
  geo_enabled: true,
  geo_request_count: 43891,
  geo_request_limit: 1000000,
  geo_usage_percent: 4.3891,
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

    it('should validate historical date format', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(
        client.getSalesTaxByAddress({
          address: '200 Spectrum Center Drive',
          historical: '2024-1-1',
        })
      ).rejects.toThrow(ZiptaxValidationError);
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
});
