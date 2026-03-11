/**
 * Main ZipTax API client
 */

import { HTTPClient } from './utils/http';
import { ZiptaxConfigurationError, ZiptaxValidationError } from './exceptions';
import {
  validateApiKey,
  validateRequired,
  validateMaxLength,
  validatePattern,
  parseAddressString,
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
  CalculateCartRequest,
  CalculateCartResponse,
  TaxCloudCalculateCartResponse,
  CreateOrderRequest,
  CreateOrderFromCartRequest,
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
      validatePattern(params.historical, /^[0-9]{6}$/, 'historical', 'YYYYMM format');
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
      validatePattern(params.historical, /^[0-9]{6}$/, 'historical', 'YYYYMM format');
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
   * Calculate sales tax for a shopping cart.
   *
   * Routes to TaxCloud API when TaxCloud credentials are configured,
   * otherwise routes to ZipTax API. The input contract (CalculateCartRequest)
   * is the same regardless of which backend is used.
   *
   * @param request - Cart with line items, addresses, and currency
   * @returns CalculateCartResponse (ZipTax) or TaxCloudCalculateCartResponse (TaxCloud)
   */
  async calculateCart(
    request: CalculateCartRequest
  ): Promise<CalculateCartResponse | TaxCloudCalculateCartResponse> {
    // Validate cart structure
    this.validateCartRequest(request);

    // Route to TaxCloud if configured
    if (this.taxCloudHttpClient && this.config.taxCloudConnectionId) {
      return this.calculateCartTaxCloud(request);
    }

    // Default: route to ZipTax API
    return this.httpClient.post<CalculateCartResponse>('/calculate/cart', request);
  }

  /**
   * Validate the cart request structure
   */
  private validateCartRequest(request: CalculateCartRequest): void {
    validateRequired(request.items, 'items');

    if (!Array.isArray(request.items) || request.items.length !== 1) {
      throw new ZiptaxValidationError('items array must contain exactly 1 cart element');
    }

    const cart = request.items[0];
    validateRequired(cart.customerId, 'customerId');
    validateRequired(cart.currency, 'currency');
    validateRequired(cart.currency.currencyCode, 'currency.currencyCode');

    if (cart.currency.currencyCode !== 'USD') {
      throw new ZiptaxValidationError("currency.currencyCode must be 'USD'");
    }

    validateRequired(cart.destination, 'destination');
    validateRequired(cart.destination.address, 'destination.address');
    validateRequired(cart.origin, 'origin');
    validateRequired(cart.origin.address, 'origin.address');
    validateRequired(cart.lineItems, 'lineItems');

    if (!Array.isArray(cart.lineItems) || cart.lineItems.length < 1) {
      throw new ZiptaxValidationError('lineItems must contain at least 1 item');
    }

    if (cart.lineItems.length > 250) {
      throw new ZiptaxValidationError('lineItems must not exceed 250 items');
    }

    for (const item of cart.lineItems) {
      validateRequired(item.itemId, 'lineItems[].itemId');

      if (typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price <= 0) {
        throw new ZiptaxValidationError(
          'lineItems[].price must be a finite positive number greater than 0'
        );
      }

      if (
        typeof item.quantity !== 'number' ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0
      ) {
        throw new ZiptaxValidationError(
          'lineItems[].quantity must be a finite positive number greater than 0'
        );
      }
    }
  }

  /**
   * Transform and send cart calculation request to TaxCloud API.
   * Parses single-string addresses into structured components,
   * maps taxabilityCode to tic, and adds 0-based index to line items.
   */
  private async calculateCartTaxCloud(
    request: CalculateCartRequest
  ): Promise<TaxCloudCalculateCartResponse> {
    const transformedBody = this.transformCartForTaxCloud(request);
    const connectionId = this.config.taxCloudConnectionId!;
    const path = `/tax/connections/${connectionId}/carts`;

    return this.taxCloudHttpClient!.post<TaxCloudCalculateCartResponse>(path, transformedBody);
  }

  /**
   * Transform CalculateCartRequest into TaxCloud's request format.
   * - Parses single-string addresses into structured components
   * - Maps taxabilityCode to tic field (defaults to 0)
   * - Adds 0-based index to each line item
   */
  private transformCartForTaxCloud(request: CalculateCartRequest): Record<string, unknown> {
    const items = request.items.map((cartItem) => {
      const destination = parseAddressString(cartItem.destination.address);
      const origin = parseAddressString(cartItem.origin.address);

      const lineItems = cartItem.lineItems.map((lineItem, idx) => ({
        index: idx,
        itemId: lineItem.itemId,
        price: lineItem.price,
        quantity: lineItem.quantity,
        tic: lineItem.taxabilityCode ?? 0,
      }));

      return {
        customerId: cartItem.customerId,
        currency: {
          currencyCode: cartItem.currency.currencyCode,
        },
        destination,
        origin,
        lineItems,
      };
    });

    return { items };
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
   * Create a TaxCloud order from a previously calculated cart.
   * Converts an existing cart (created via calculateCart with TaxCloud
   * credentials) into a finalized order for tax filing.
   *
   * @param request - Cart-to-order request containing cartId and orderId
   * @returns OrderResponse with created order details
   */
  async createOrderFromCart(request: CreateOrderFromCartRequest): Promise<OrderResponse> {
    this.verifyTaxCloudCredentials();

    // Validate required fields
    validateRequired(request.cartId, 'cartId');
    validateRequired(request.orderId, 'orderId');

    const connectionId = this.config.taxCloudConnectionId!;
    const path = `/tax/connections/${connectionId}/carts/orders`;

    return this.taxCloudHttpClient!.post<OrderResponse>(path, request);
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
