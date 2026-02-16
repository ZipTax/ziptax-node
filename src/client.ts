/**
 * Main ZipTax API client
 */

import { HTTPClient } from './utils/http';
import { ZiptaxConfigurationError } from './exceptions';
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
  GetRatesByPostalCodeParams,
  GetAccountMetricsParams,
} from './config';
import {
  V60Response,
  V60PostalCodeResponse,
  V60AccountMetrics,
  CreateOrderRequest,
  OrderResponse,
  UpdateOrderRequest,
  RefundTransactionRequest,
  RefundTransactionResponse,
} from './models';

/**
 * ZipTax API client
 */
export class ZiptaxClient {
  private readonly httpClient: HTTPClient;
  private readonly taxCloudHttpClient?: HTTPClient;
  private readonly config: Required<
    Omit<ZiptaxConfig, 'retryOptions' | 'taxCloudConnectionId' | 'taxCloudAPIKey'>
  > &
    Pick<ZiptaxConfig, 'retryOptions' | 'taxCloudConnectionId' | 'taxCloudAPIKey'>;

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

    // Initialize ZipTax HTTP client
    this.httpClient = new HTTPClient({
      baseURL: this.config.baseURL,
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
      retryOptions: this.config.retryOptions,
      enableLogging: this.config.enableLogging,
    });

    // Initialize TaxCloud HTTP client if credentials are provided
    if (config.taxCloudConnectionId && config.taxCloudAPIKey) {
      this.taxCloudHttpClient = new HTTPClient({
        baseURL: 'https://api.v3.taxcloud.com',
        apiKey: config.taxCloudAPIKey,
        timeout: this.config.timeout,
        retryOptions: this.config.retryOptions,
        enableLogging: this.config.enableLogging,
      });
    }
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
   * Get sales and use tax rate details from a postal code input
   * @param params - Query parameters
   * @returns V60PostalCodeResponse with tax rate details
   */
  async getRatesByPostalCode(params: GetRatesByPostalCodeParams): Promise<V60PostalCodeResponse> {
    // Validate required parameters
    validateRequired(params.postalcode, 'postalcode');
    validateMaxLength(params.postalcode, 5, 'postalcode');
    validatePattern(params.postalcode, /^[0-9]{5}$/, 'postalcode', '5-digit format');

    // Make API request
    return this.httpClient.get<V60PostalCodeResponse>('/request/v60/', {
      params: {
        postalcode: params.postalcode,
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
   * Verify TaxCloud credentials are configured
   * @throws ZiptaxConfigurationError if TaxCloud credentials are not configured
   */
  private verifyTaxCloudCredentials(): void {
    if (!this.taxCloudHttpClient || !this.config.taxCloudConnectionId) {
      throw new ZiptaxConfigurationError(
        'TaxCloud credentials not configured. Please provide taxCloudConnectionId and taxCloudAPIKey in the client configuration.'
      );
    }
  }

  /**
   * Create a new TaxCloud order
   * @param request - Order creation request
   * @returns OrderResponse with created order details
   */
  async createOrder(request: CreateOrderRequest): Promise<OrderResponse> {
    this.verifyTaxCloudCredentials();

    // Validate required fields
    validateRequired(request.orderId, 'orderId');
    validateRequired(request.customerId, 'customerId');
    validateRequired(request.transactionDate, 'transactionDate');
    validateRequired(request.completedDate, 'completedDate');

    const connectionId = this.config.taxCloudConnectionId!;
    const path = `/tax/connections/${connectionId}/orders`;

    return this.taxCloudHttpClient!.post<OrderResponse>(path, request);
  }

  /**
   * Get an existing TaxCloud order by ID
   * @param orderId - Unique order identifier
   * @returns OrderResponse with order details
   */
  async getOrder(orderId: string): Promise<OrderResponse> {
    this.verifyTaxCloudCredentials();

    // Validate required fields
    validateRequired(orderId, 'orderId');

    const connectionId = this.config.taxCloudConnectionId!;
    const path = `/tax/connections/${connectionId}/orders/${orderId}`;

    return this.taxCloudHttpClient!.get<OrderResponse>(path);
  }

  /**
   * Update an existing TaxCloud order
   * @param orderId - Unique order identifier
   * @param request - Order update request
   * @returns OrderResponse with updated order details
   */
  async updateOrder(orderId: string, request: UpdateOrderRequest): Promise<OrderResponse> {
    this.verifyTaxCloudCredentials();

    // Validate required fields
    validateRequired(orderId, 'orderId');
    validateRequired(request.completedDate, 'completedDate');

    const connectionId = this.config.taxCloudConnectionId!;
    const path = `/tax/connections/${connectionId}/orders/${orderId}`;

    return this.taxCloudHttpClient!.patch<OrderResponse>(path, request);
  }

  /**
   * Refund a TaxCloud order
   * @param orderId - Unique order identifier
   * @param request - Refund request with items to refund
   * @returns Array of RefundTransactionResponse
   */
  async refundOrder(
    orderId: string,
    request?: RefundTransactionRequest
  ): Promise<RefundTransactionResponse[]> {
    this.verifyTaxCloudCredentials();

    // Validate required fields
    validateRequired(orderId, 'orderId');

    const connectionId = this.config.taxCloudConnectionId!;
    const path = `/tax/connections/${connectionId}/orders/refunds/${orderId}`;

    // Empty or omitted items means full refund per TaxCloud API spec
    return this.taxCloudHttpClient!.post<RefundTransactionResponse[]>(path, request || {});
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
      taxCloudConnectionId: this.config.taxCloudConnectionId,
      taxCloudAPIKey: this.config.taxCloudAPIKey,
    };
  }
}
