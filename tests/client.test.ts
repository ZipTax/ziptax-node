/**
 * Tests for ZiptaxClient rate lookups, account, product codes, and system
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
      displayRates: [{ name: 'Total Rate', rate: 0.0775 }],
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
      countyTaxCode: '30',
      districtSalesTax: 0.015,
      districtUseTax: 0.015,
      district1Code: '037',
      district1SalesTax: 0.005,
      district1UseTax: 0.005,
      district2Code: '',
      district2SalesTax: 0,
      district2UseTax: 0,
      district3Code: '',
      district3SalesTax: 0,
      district3UseTax: 0,
      district4Code: '',
      district4SalesTax: 0,
      district4UseTax: 0,
      district5Code: '',
      district5SalesTax: 0,
      district5UseTax: 0,
      originDestination: 'D' as const,
    },
  ],
  addressDetail: {
    normalizedAddress: '',
    incorporated: '',
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

const mockAccountUsage = {
  is_active: true,
  core_request_count: 15595,
  core_request_limit: 1000000,
  core_usage_percent: 1.5595,
  geo_request_count: 2300,
  geo_request_limit: 50000,
  geo_usage_percent: 4.6,
  geo_enabled: true,
  merchant_request_count: 120,
  merchant_request_limit: 10000,
  merchant_usage_percent: 1.2,
  message: 'Contact support@zip.tax to modify your account',
};

describe('ZiptaxClient', () => {
  let mockHttpClient: jest.Mocked<HTTPClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
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
      expect(config.environment).toBe('LIVE');
    });

    it('should accept custom configuration', () => {
      const client = new ZiptaxClient({
        apiKey: 'test-api-key',
        baseURL: 'https://custom.api.com',
        timeout: 5000,
        environment: 'TEST',
      });
      const config = client.getConfig();
      expect(config.baseURL).toBe('https://custom.api.com');
      expect(config.timeout).toBe(5000);
      expect(config.environment).toBe('TEST');
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
      expect(mockHttpClient.get).toHaveBeenCalledWith('/request/v60', {
        params: {
          address: '200 Spectrum Center Drive, Irvine, CA 92618',
          city: undefined,
          state: undefined,
          stateCode: undefined,
          county: undefined,
          sat_item_total: undefined,
          taxabilityCode: undefined,
          countryCode: 'USA',
          historical: undefined,
          format: 'json',
          adjustment: undefined,
          addressDetailExtended: undefined,
          shippingExtended: undefined,
        },
      });
    });

    it('should request the path without a trailing slash to avoid a 301', async () => {
      mockHttpClient.get.mockResolvedValue(mockV60Response);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      await client.getSalesTaxByAddress({ address: '200 Spectrum Center Drive' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/request/v60', expect.anything());
    });

    it('should pass the extended and disambiguation parameters through', async () => {
      mockHttpClient.get.mockResolvedValue(mockV60Response);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      await client.getSalesTaxByAddress({
        address: '200 Spectrum Center Drive',
        city: 'Irvine',
        state: 'California',
        stateCode: 'ca',
        county: 'Orange',
        satItemTotal: 1600,
        adjustment: 'origin',
        addressDetailExtended: true,
        shippingExtended: true,
        taxabilityCode: '20010',
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/request/v60', {
        params: expect.objectContaining({
          city: 'Irvine',
          state: 'California',
          stateCode: 'CA',
          county: 'Orange',
          sat_item_total: 1600,
          adjustment: 'origin',
          addressDetailExtended: true,
          shippingExtended: true,
          taxabilityCode: '20010',
        }),
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

    it('should accept alphanumeric override taxability codes', async () => {
      mockHttpClient.get.mockResolvedValue(mockV60Response);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      await expect(
        client.getSalesTaxByAddress({
          address: '200 Spectrum Center Drive',
          taxabilityCode: 'CIR00001',
        })
      ).resolves.toEqual(mockV60Response);
    });

    it('should reject taxability codes longer than 10 characters', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(
        client.getSalesTaxByAddress({
          address: '200 Spectrum Center Drive',
          taxabilityCode: 'ABCDEFGHIJK',
        })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject taxability codes with punctuation', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(
        client.getSalesTaxByAddress({
          address: '200 Spectrum Center Drive',
          taxabilityCode: 'not-valid',
        })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject an invalid stateCode', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(
        client.getSalesTaxByAddress({ address: '200 Spectrum Center Drive', stateCode: 'CAL' })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a negative satItemTotal', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(
        client.getSalesTaxByAddress({ address: '200 Spectrum Center Drive', satItemTotal: -1 })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should validate historical date format (YYYYMM)', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(
        client.getSalesTaxByAddress({
          address: '200 Spectrum Center Drive',
          historical: '2024-01',
        })
      ).rejects.toThrow(ZiptaxValidationError);
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

    it('should accept US territory country codes', async () => {
      mockHttpClient.get.mockResolvedValue(mockV60Response);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      await client.getSalesTaxByAddress({ address: '1 Main St', countryCode: 'PRI' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/request/v60', {
        params: expect.objectContaining({ countryCode: 'PRI' }),
      });
    });
  });

  describe('getSalesTaxByGeoLocation', () => {
    it('should get tax rates by geolocation', async () => {
      mockHttpClient.get.mockResolvedValue(mockV60Response);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.getSalesTaxByGeoLocation({
        lat: 33.65253,
        lng: -117.74794,
      });

      expect(result).toEqual(mockV60Response);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/request/v60', {
        params: {
          lat: 33.65253,
          lng: -117.74794,
          taxabilityCode: undefined,
          countryCode: 'USA',
          historical: undefined,
          format: 'json',
          adjustment: undefined,
          addressDetailExtended: undefined,
          shippingExtended: undefined,
        },
      });
    });

    it('should throw error for missing lat', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(
        client.getSalesTaxByGeoLocation({ lat: undefined as unknown as number, lng: -117.7 })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should throw error for missing lng', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(
        client.getSalesTaxByGeoLocation({ lat: 33.6, lng: undefined as unknown as number })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject out-of-range latitude', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.getSalesTaxByGeoLocation({ lat: 91, lng: 0 })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should reject out-of-range longitude', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.getSalesTaxByGeoLocation({ lat: 0, lng: -181 })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should reject a non-numeric coordinate', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(
        client.getSalesTaxByGeoLocation({ lat: '33.6' as unknown as number, lng: 0 })
      ).rejects.toThrow(ZiptaxValidationError);
    });
  });

  describe('getRatesByPostalCode', () => {
    it('should get rates by postal code', async () => {
      mockHttpClient.get.mockResolvedValue(mockPostalCodeResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.getRatesByPostalCode({ postalcode: '92694' });

      expect(result).toEqual(mockPostalCodeResponse);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/request/v60', {
        params: expect.objectContaining({ postalcode: '92694', format: 'json' }),
      });
    });

    it('should pass state through to narrow overlapping jurisdictions', async () => {
      mockHttpClient.get.mockResolvedValue(mockPostalCodeResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      await client.getRatesByPostalCode({ postalcode: '92694', state: 'CA' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/request/v60', {
        params: expect.objectContaining({ state: 'CA' }),
      });
    });

    it('should reject a non-5-digit postal code', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.getRatesByPostalCode({ postalcode: '9269' })).rejects.toThrow(
        ZiptaxValidationError
      );
      await expect(client.getRatesByPostalCode({ postalcode: 'abcde' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should reject a missing postal code', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.getRatesByPostalCode({ postalcode: '' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });
  });

  describe('getAccountMetrics', () => {
    it('should get v6.0 account metrics', async () => {
      mockHttpClient.get.mockResolvedValue(mockAccountMetrics);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.getAccountMetrics();

      expect(result).toEqual(mockAccountMetrics);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/account/v60/metrics', {
        params: undefined,
      });
    });

    it('should pass format when supplied', async () => {
      mockHttpClient.get.mockResolvedValue(mockAccountMetrics);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      await client.getAccountMetrics({ format: 'xml' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/account/v60/metrics', {
        params: { format: 'xml' },
      });
    });
  });

  describe('getAccountUsage', () => {
    it('should get the per-quota account usage breakdown', async () => {
      mockHttpClient.get.mockResolvedValue(mockAccountUsage);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.getAccountUsage();

      expect(result).toEqual(mockAccountUsage);
      expect(result.merchant_request_count).toBe(120);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/account/metrics');
    });
  });

  describe('searchProductCodes', () => {
    const mockSearchResponse = {
      $schema: 'https://api.zip-tax.com/schemas/ticsearch',
      query: 'baked bread in plastic packaging',
      nextCursor: 'eyJvZmZzZXQiOjEwfQ==',
      results: [
        {
          ticId: 41030,
          label: 'Bakery Items',
          naturalLabel: 'Bakery Items',
          description: 'Bakery items sold without eating utensils',
          documentation: 'Bakery items sold without eating utensils provided by the seller.',
          rank: 1,
          score: 0.891025641025641,
        },
      ],
    };

    it('should search product codes', async () => {
      mockHttpClient.post.mockResolvedValue(mockSearchResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.searchProductCodes('baked bread in plastic packaging');

      expect(result).toEqual(mockSearchResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/search/tic', {
        query: 'baked bread in plastic packaging',
      });
    });

    it('should return numeric ticId, rank, and score', async () => {
      mockHttpClient.post.mockResolvedValue(mockSearchResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.searchProductCodes('bread');
      const first = result.results![0];

      expect(typeof first.ticId).toBe('number');
      expect(typeof first.rank).toBe('number');
      expect(typeof first.score).toBe('number');
    });

    it('should reject an empty query', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.searchProductCodes('')).rejects.toThrow(ZiptaxValidationError);
      await expect(client.searchProductCodes('   ')).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a non-string query', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.searchProductCodes(42 as unknown as string)).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should accept a query up to 1024 characters', async () => {
      mockHttpClient.post.mockResolvedValue(mockSearchResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      await expect(client.searchProductCodes('a'.repeat(1024))).resolves.toBeDefined();
      await expect(client.searchProductCodes('a'.repeat(1025))).rejects.toThrow(
        ZiptaxValidationError
      );
    });
  });

  describe('recommendProductCode', () => {
    const mockRecommendResponse = {
      predictions: [
        {
          status: 'success' as const,
          error: null,
          ticId: 41030,
          label: 'Bakery Items',
          naturalLabel: 'Bakery Items',
          tic_description: 'Bakery items sold without eating utensils',
          product_description: 'baked bread in plastic packaging',
        },
      ],
    };

    it('should recommend a product code', async () => {
      mockHttpClient.post.mockResolvedValue(mockRecommendResponse);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.recommendProductCode('baked bread in plastic packaging');

      expect(result).toEqual(mockRecommendResponse);
      expect(typeof result.predictions[0].ticId).toBe('number');
      expect(mockHttpClient.post).toHaveBeenCalledWith('/search/tic/recommend', {
        query: 'baked bread in plastic packaging',
      });
    });

    it('should reject an empty query', async () => {
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });
      await expect(client.recommendProductCode('')).rejects.toThrow(ZiptaxValidationError);
    });
  });

  describe('getTicData', () => {
    const mockTicData = {
      tic_list: [
        {
          tic: {
            id: '0',
            parent: '0',
            title: 'Uncategorized tangible personal property',
            label: 'General',
            nl_title: 'Uncategorized Tangible Personal Property',
            nl_label: 'General tangible personal property',
          },
        },
      ],
    };

    it('should get the full TIC list', async () => {
      mockHttpClient.get.mockResolvedValue(mockTicData);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.getTicData();

      expect(result).toEqual(mockTicData);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/data/tic', { params: undefined });
    });

    it('should pass format when supplied', async () => {
      mockHttpClient.get.mockResolvedValue(mockTicData);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      await client.getTicData({ format: 'xml' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/data/tic', { params: { format: 'xml' } });
    });
  });

  describe('getTicSearchSchema', () => {
    it('should get the TIC search JSON Schema', async () => {
      const schema = { type: 'object', required: ['query', 'results'] };
      mockHttpClient.get.mockResolvedValue(schema);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.getTicSearchSchema();

      expect(result).toEqual(schema);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/schemas/ticsearch');
    });
  });

  describe('system endpoints', () => {
    it('should get health', async () => {
      const health = {
        status: 'ok',
        components: { taxdata: 'ok' as const, taxdata_count: 83633, dynamo: 'ok' as const },
      };
      mockHttpClient.get.mockResolvedValue(health);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.getHealth();

      expect(result).toEqual(health);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/system/health');
    });

    it('should get system metadata', async () => {
      const metadata = { go_version: 'go1.25.0', hostname: 'ip-172-30-5-43.ec2.internal' };
      mockHttpClient.get.mockResolvedValue(metadata);
      const client = new ZiptaxClient({ apiKey: 'test-api-key' });

      const result = await client.getSystemMetadata();

      expect(result).toEqual(metadata);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/system/metadata');
    });
  });
});
