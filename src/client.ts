/**
 * Main ZipTax API client
 */

import { HTTPClient } from './utils/http';
import {
  validateApiKey,
  validateRequired,
  validateMaxLength,
  validatePattern,
} from './utils/validation';
import {
  ZiptaxConfig,
  DEFAULT_CONFIG,
  GetSalesTaxByAddressParams,
  GetSalesTaxByGeoLocationParams,
  GetAccountMetricsParams,
} from './config';
import { V60Response, V60AccountMetrics } from './models';

/**
 * ZipTax API client
 */
export class ZiptaxClient {
  private readonly httpClient: HTTPClient;
  private readonly config: Required<Omit<ZiptaxConfig, 'retryOptions'>> &
    Pick<ZiptaxConfig, 'retryOptions'>;

  /**
   * Create a new ZipTax client instance
   * @param config - Client configuration
   */
  constructor(config: ZiptaxConfig) {
    // Validate API key
    validateApiKey(config.apiKey);

    // Merge with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    // Initialize HTTP client
    this.httpClient = new HTTPClient({
      baseURL: this.config.baseURL,
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
      retryOptions: this.config.retryOptions,
      enableLogging: this.config.enableLogging,
    });
  }

  /**
   * Get sales and use tax rate details from an address input
   * @param params - Query parameters
   * @returns V60Response with tax rate details
   */
  async getSalesTaxByAddress(params: GetSalesTaxByAddressParams): Promise<V60Response> {
    // Validate required parameters
    validateRequired(params.address, 'address');
    validateMaxLength(params.address, 100, 'address');

    // Validate optional parameters
    if (params.taxabilityCode) {
      validatePattern(params.taxabilityCode, /^[0-9]+$/, 'taxabilityCode', 'numeric string');
    }

    if (params.historical) {
      validatePattern(params.historical, /^[0-9]{4}-[0-9]{2}$/, 'historical', 'YYYY-MM format');
    }

    // Make API request
    return this.httpClient.get<V60Response>('/request/v60/', {
      params: {
        address: params.address,
        taxabilityCode: params.taxabilityCode,
        countryCode: params.countryCode || 'USA',
        historical: params.historical,
        format: params.format || 'json',
      },
    });
  }

  /**
   * Get sales and use tax rate details from a geolocation input
   * @param params - Query parameters
   * @returns V60Response with tax rate details
   */
  async getSalesTaxByGeoLocation(params: GetSalesTaxByGeoLocationParams): Promise<V60Response> {
    // Validate required parameters
    validateRequired(params.lat, 'lat');
    validateRequired(params.lng, 'lng');
    validateMaxLength(params.lat, 100, 'lat');
    validateMaxLength(params.lng, 100, 'lng');

    // Validate optional parameters
    if (params.historical) {
      validatePattern(params.historical, /^[0-9]{4}-[0-9]{2}$/, 'historical', 'YYYY-MM format');
    }

    // Make API request
    return this.httpClient.get<V60Response>('/request/v60/', {
      params: {
        lat: params.lat,
        lng: params.lng,
        countryCode: params.countryCode || 'USA',
        historical: params.historical,
        format: params.format || 'json',
      },
    });
  }

  /**
   * Get account metrics related to sales and use tax
   * @param params - Query parameters (optional)
   * @returns V60AccountMetrics with account usage information
   */
  async getAccountMetrics(params?: GetAccountMetricsParams): Promise<V60AccountMetrics> {
    return this.httpClient.get<V60AccountMetrics>('/account/v60/metrics', {
      params: params?.format ? { format: params.format } : undefined,
    });
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<ZiptaxConfig> {
    return {
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      retryOptions: this.config.retryOptions,
      enableLogging: this.config.enableLogging,
    };
  }
}
