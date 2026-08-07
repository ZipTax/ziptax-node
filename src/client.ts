/**
 * Main ZipTax API client
 */

import { HTTPClient, HTTPRequestOptions } from './utils/http.js';
import { RetryOptions, NO_RETRY, RETRY_ON_NO_RESPONSE } from './utils/retry.js';
import { ZiptaxValidationError } from './exceptions.js';
import {
  validateApiKey,
  validateRequired,
  validateMaxLength,
  validatePattern,
  validateHistorical,
  validateNumberRange,
  validateProductQuery,
  validateUuid,
} from './utils/validation.js';
import {
  ZiptaxConfig,
  DEFAULT_CONFIG,
  RequestOptions,
  MerchantEnvironment,
  GetSalesTaxByAddressParams,
  GetSalesTaxByGeoLocationParams,
  GetRatesByPostalCodeParams,
  GetAccountMetricsParams,
  GetTicDataParams,
} from './config.js';
import {
  V60Response,
  V60PostalCodeResponse,
  V60AccountMetrics,
  AccountUsageMetrics,
  HealthResponse,
  SystemMetadataResponse,
  TicDataResponse,
  ProductCodeSearchRequest,
  ProductCodeSearchResponse,
  ProductCodeRecommendationResponse,
  CreateMerchantRequest,
  CreateMerchantResponse,
  UpdateMerchantRequest,
  UpdateMerchantResponse,
  DeleteMerchantResponse,
  GetMerchantResponse,
  ListMerchantsResponse,
  SetMerchantCredentialsRequest,
  SetMerchantCredentialsResponse,
  DeleteMerchantCredentialsResponse,
  CalculateCartRequest,
  AnyCalculateCartResponse,
  CreateOrderRequest,
  CreateOrderFromCartRequest,
  GetOrderRequest,
  UpdateOrderRequest,
  OrderResponse,
  CreateRefundRequest,
  RefundResponse,
  CreateCertificateRequest,
  GetCertificateRequest,
  DeleteCertificateRequest,
  ListCertificatesRequest,
  CertificateResponse,
  ListCertificatesResponse,
} from './models/index.js';

/** Maximum carts accepted in a single cart calculation request */
const MAX_CARTS_PER_REQUEST = 100;
/** Maximum line-item index accepted by the API */
const MAX_LINE_ITEM_INDEX = 500;
/** Maximum quantity accepted per line item */
const MAX_LINE_ITEM_QUANTITY = 99999.9999;

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

    // Initialize ZipTax HTTP client
    this.httpClient = new HTTPClient({
      baseURL: this.config.baseURL,
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
      retryOptions: this.config.retryOptions,
      enableLogging: this.config.enableLogging,
    });
  }

  // -------------------------------------------------------------------------
  // Rate lookups
  // -------------------------------------------------------------------------

  /**
   * Get sales and use tax rate details from an address input
   * @param params - Query parameters
   * @returns V60Response with tax rate details
   */
  async getSalesTaxByAddress(params: GetSalesTaxByAddressParams): Promise<V60Response> {
    validateRequired(params.address, 'address');
    validateMaxLength(params.address, 100, 'address');

    this.validateCommonRateParams(params);

    if (params.stateCode) {
      validatePattern(params.stateCode, /^[A-Za-z]{2}$/, 'stateCode', 'two-letter state code');
    }

    if (params.satItemTotal !== undefined) {
      validateNumberRange(params.satItemTotal, 0, Number.MAX_SAFE_INTEGER, 'satItemTotal');
    }

    return this.httpClient.get<V60Response>('/request/v60', {
      params: {
        address: params.address,
        city: params.city,
        state: params.state,
        stateCode: params.stateCode ? params.stateCode.toUpperCase() : undefined,
        county: params.county,
        sat_item_total: params.satItemTotal,
        ...this.commonRateQuery(params),
      },
    });
  }

  /**
   * Get sales and use tax rate details from a geolocation input
   * @param params - Query parameters
   * @returns V60Response with tax rate details
   */
  async getSalesTaxByGeoLocation(params: GetSalesTaxByGeoLocationParams): Promise<V60Response> {
    validateRequired(params.lat, 'lat');
    validateRequired(params.lng, 'lng');
    validateNumberRange(params.lat, -90, 90, 'lat');
    validateNumberRange(params.lng, -180, 180, 'lng');

    this.validateCommonRateParams(params);

    return this.httpClient.get<V60Response>('/request/v60', {
      params: {
        lat: params.lat,
        lng: params.lng,
        ...this.commonRateQuery(params),
      },
    });
  }

  /**
   * Get sales and use tax rate details from a postal code input.
   *
   * A postal-code-only lookup can overlap several jurisdictions, so this
   * returns the legacy multi-result shape rather than a single resolved rate.
   *
   * @param params - Query parameters
   * @returns V60PostalCodeResponse with tax rate details
   */
  async getRatesByPostalCode(params: GetRatesByPostalCodeParams): Promise<V60PostalCodeResponse> {
    validateRequired(params.postalcode, 'postalcode');
    validateMaxLength(params.postalcode, 5, 'postalcode');
    validatePattern(params.postalcode, /^[0-9]{5}$/, 'postalcode', '5-digit format');

    this.validateCommonRateParams(params);

    return this.httpClient.get<V60PostalCodeResponse>('/request/v60', {
      params: {
        postalcode: params.postalcode,
        state: params.state,
        ...this.commonRateQuery(params),
      },
    });
  }

  // -------------------------------------------------------------------------
  // Account
  // -------------------------------------------------------------------------

  /**
   * Get v6.0 account metrics: request count, limit, and usage percentage
   * @param params - Query parameters (optional)
   * @returns V60AccountMetrics with account usage information
   */
  async getAccountMetrics(params?: GetAccountMetricsParams): Promise<V60AccountMetrics> {
    return this.httpClient.get<V60AccountMetrics>('/account/v60/metrics', {
      params: params?.format ? { format: params.format } : undefined,
    });
  }

  /**
   * Get full account usage, broken out by quota type.
   *
   * Unlike {@link getAccountMetrics}, this reports core (tax lookup), geocoding,
   * and merchant request quotas separately. Merchant Transactions are metered
   * against the merchant allowance, not the tax-lookup allowance.
   *
   * @returns AccountUsageMetrics with per-quota usage information
   */
  async getAccountUsage(): Promise<AccountUsageMetrics> {
    return this.httpClient.get<AccountUsageMetrics>('/account/metrics');
  }

  // -------------------------------------------------------------------------
  // Product codes (TICs)
  // -------------------------------------------------------------------------

  /**
   * Search for product codes (TICs) by natural language description.
   * Returns all matching Taxability Information Codes ranked and scored
   * by relevance.
   *
   * Use the returned ticId as the `taxabilityCode` parameter in rate requests
   * (as a string), or as `tic` on cart and order line items (as a number).
   *
   * @param query - Natural language product description
   *   (e.g., "baked goods sold in plastic packaging")
   * @returns ProductCodeSearchResponse with ranked search results
   *
   * @example
   * ```typescript
   * const response = await client.searchProductCodes(
   *   "baked goods sold in plastic packaging"
   * );
   * for (const result of response.results ?? []) {
   *   console.log(`${result.ticId}: ${result.label} (score=${result.score})`);
   * }
   * ```
   */
  async searchProductCodes(query: string): Promise<ProductCodeSearchResponse> {
    validateProductQuery(query);

    const reqBody: ProductCodeSearchRequest = { query };

    return this.httpClient.post<ProductCodeSearchResponse>('/search/tic', reqBody);
  }

  /**
   * Get an AI-powered product code (TIC) recommendation.
   * Returns a single best-match TIC code with higher accuracy than
   * searchProductCodes. Has slightly higher latency due to the AI
   * processing step.
   *
   * @param query - Natural language product description
   *   (e.g., "baked goods sold in plastic packaging")
   * @returns ProductCodeRecommendationResponse with AI-powered recommendation
   *
   * @example
   * ```typescript
   * const response = await client.recommendProductCode(
   *   "baked goods sold in plastic packaging"
   * );
   * const prediction = response.predictions[0];
   * if (prediction.status === "success") {
   *   console.log(`Recommended TIC: ${prediction.ticId} (${prediction.label})`);
   * }
   * ```
   */
  async recommendProductCode(query: string): Promise<ProductCodeRecommendationResponse> {
    validateProductQuery(query);

    const reqBody: ProductCodeSearchRequest = { query };

    return this.httpClient.post<ProductCodeRecommendationResponse>(
      '/search/tic/recommend',
      reqBody
    );
  }

  /**
   * Get the full list of Taxability Information Codes (TICs), including the
   * category hierarchy.
   *
   * This endpoint is public and needs no API key, but the client sends one
   * anyway.
   *
   * @param params - Query parameters (optional)
   * @returns TicDataResponse with the full TIC list
   */
  async getTicData(params?: GetTicDataParams): Promise<TicDataResponse> {
    return this.httpClient.get<TicDataResponse>('/data/tic', {
      params: params?.format ? { format: params.format } : undefined,
    });
  }

  /**
   * Get the JSON Schema describing the TIC search response.
   *
   * @returns The raw JSON Schema document
   */
  async getTicSearchSchema(): Promise<Record<string, unknown>> {
    return this.httpClient.get<Record<string, unknown>>('/schemas/ticsearch');
  }

  // -------------------------------------------------------------------------
  // System
  // -------------------------------------------------------------------------

  /**
   * Check API health, including tax-data cache and DynamoDB connectivity.
   *
   * This endpoint is public and needs no API key.
   *
   * @returns HealthResponse with overall and per-component status
   */
  async getHealth(): Promise<HealthResponse> {
    return this.httpClient.get<HealthResponse>('/system/health');
  }

  /**
   * Get metadata about the API instance serving requests.
   *
   * This endpoint is public and needs no API key.
   *
   * @returns SystemMetadataResponse with runtime and host information
   */
  async getSystemMetadata(): Promise<SystemMetadataResponse> {
    return this.httpClient.get<SystemMetadataResponse>('/system/metadata');
  }

  // -------------------------------------------------------------------------
  // Merchant management
  // -------------------------------------------------------------------------

  /**
   * Create a merchant.
   *
   * `merchant_type` selects the compliance model and cannot be changed later
   * through the API. It defaults to `taxcloud`, which starts the TaxCloud
   * invite process; pass `self-managed` explicitly for a merchant that is
   * active immediately and handles its own compliance.
   *
   * Your account must have a Company Name configured before any merchant can be
   * created, otherwise the API returns 400. Reusing a `referenceId` that already
   * belongs to another merchant returns 409.
   *
   * @param request - Merchant details
   * @returns CreateMerchantResponse containing the new merchantId
   *
   * @experimental Merchant Management is a Private Preview feature; contact
   *   support@zip.tax for access. Request and response shapes may change.
   *
   * @example
   * ```typescript
   * const { merchantId } = await client.createMerchant({
   *   merchantName: 'Acme Outfitters',
   *   contactEmail: 'jane@acmeoutfitters.com',
   *   referenceId: 'acct-10482',
   *   merchant_type: 'self-managed',
   * });
   * ```
   */
  async createMerchant(request: CreateMerchantRequest): Promise<CreateMerchantResponse> {
    validateRequired(request.merchantName, 'merchantName');
    validateMaxLength(request.merchantName, 255, 'merchantName');

    return this.httpClient.post<CreateMerchantResponse>('/merchant/create', request);
  }

  /**
   * Update a merchant's name, contact details, or referenceId.
   *
   * The update schema does not include `merchant_type`: a merchant's compliance
   * model cannot be changed through the API.
   *
   * @param request - Merchant id and the new field values
   * @returns UpdateMerchantResponse
   *
   * @experimental Private Preview
   */
  async updateMerchant(request: UpdateMerchantRequest): Promise<UpdateMerchantResponse> {
    validateUuid(request.merchantId, 'merchantId');
    validateRequired(request.update, 'update');
    validateRequired(request.update.merchantName, 'update.merchantName');
    validateMaxLength(request.update.merchantName, 255, 'update.merchantName');

    return this.httpClient.post<UpdateMerchantResponse>('/merchant/update', request);
  }

  /**
   * Retrieve a merchant.
   *
   * `merchant_type` is not returned. Use `status` to tell the compliance models
   * apart: a self-managed merchant always reports `external_compliance`.
   *
   * @param merchantId - UUID of the merchant
   * @returns GetMerchantResponse with the merchant record
   *
   * @experimental Private Preview
   */
  async getMerchant(merchantId: string): Promise<GetMerchantResponse> {
    validateUuid(merchantId, 'merchantId');

    return this.httpClient.post<GetMerchantResponse>('/merchant/get', { merchantId });
  }

  /**
   * List every merchant owned by the account.
   *
   * @returns Array of merchant records
   *
   * @experimental Private Preview
   */
  async listMerchants(): Promise<ListMerchantsResponse> {
    return this.httpClient.get<ListMerchantsResponse>('/merchant/list');
  }

  /**
   * Soft-delete a merchant.
   *
   * @param merchantId - UUID of the merchant
   * @returns DeleteMerchantResponse
   *
   * @experimental Private Preview
   */
  async deleteMerchant(merchantId: string): Promise<DeleteMerchantResponse> {
    validateUuid(merchantId, 'merchantId');

    return this.httpClient.post<DeleteMerchantResponse>('/merchant/delete', { merchantId });
  }

  /**
   * Store a merchant's TaxCloud compliance credentials.
   *
   * Credentials are stored encrypted at rest and resolved server-side on every
   * Merchant Transactions call, so they are never sent again after this call.
   * A merchant without credentials returns 404 on every transaction endpoint.
   *
   * @param request - Merchant id plus the TaxCloud connection id and API key
   * @returns SetMerchantCredentialsResponse
   *
   * @experimental Private Preview
   */
  async setMerchantCredentials(
    request: SetMerchantCredentialsRequest
  ): Promise<SetMerchantCredentialsResponse> {
    validateUuid(request.merchantId, 'merchantId');
    validateRequired(request.apiKey, 'apiKey');
    validateRequired(request.connectionId, 'connectionId');

    return this.httpClient.post<SetMerchantCredentialsResponse>(
      '/merchant/credentials/set',
      request
    );
  }

  /**
   * Remove a merchant's stored TaxCloud credentials.
   *
   * @param merchantId - UUID of the merchant
   * @returns DeleteMerchantCredentialsResponse
   *
   * @experimental Private Preview
   */
  async deleteMerchantCredentials(merchantId: string): Promise<DeleteMerchantCredentialsResponse> {
    validateUuid(merchantId, 'merchantId');

    return this.httpClient.post<DeleteMerchantCredentialsResponse>('/merchant/credentials/delete', {
      merchantId,
    });
  }

  // -------------------------------------------------------------------------
  // Merchant transactions
  // -------------------------------------------------------------------------

  /**
   * Calculate sales tax for one or more carts on behalf of a merchant.
   *
   * The response shape depends on the merchant's compliance model. A
   * TaxCloud-connected merchant returns a `connectionId` and a `cartId` you can
   * pass to {@link createOrderFromCart}; a self-managed merchant is calculated
   * by the Ziptax rate engine and is stateless, so its result cannot become an
   * order. Use `isTaxCloudCartResponse` to narrow.
   *
   * Cart calculation does not check the merchant's nexus footprint: it returns
   * the rate for the sourced address whether or not the merchant has an
   * obligation to collect there.
   *
   * @param request - Merchant id and the carts to calculate
   * @param options - Per-request overrides (e.g. environment)
   * @returns The calculated carts
   *
   * @experimental Merchant Transactions is in active development.
   *
   * @example
   * ```typescript
   * const result = await client.calculateCart({
   *   merchantId: '6b3c1f5e-2a8d-4c9b-9f2e-1d7a4b6c8e10',
   *   items: [{
   *     customerId: 'customer-453',
   *     currency: { currencyCode: 'USD' },
   *     origin: { line1: '1 Market St', city: 'San Francisco', state: 'CA', zip: '94105' },
   *     destination: { line1: '200 Spectrum Center Dr', city: 'Irvine', state: 'CA', zip: '92618' },
   *     lineItems: [{ index: 0, itemId: 'sku-1001', price: 49.99, quantity: 2 }],
   *   }],
   * });
   * ```
   */
  async calculateCart(
    request: CalculateCartRequest,
    options?: RequestOptions
  ): Promise<AnyCalculateCartResponse> {
    this.validateCartRequest(request);

    // Retried only when no response arrived at all. A 5xx means the service
    // answered and may already have calculated (and stored) the cart, and every
    // call is metered against the merchant allowance.
    return this.httpClient.post<AnyCalculateCartResponse>(
      '/merchant/cart/calculate',
      request,
      this.merchantRequestConfig(options, RETRY_ON_NO_RESPONSE)
    );
  }

  /**
   * Record an order directly, supplying the tax that was collected.
   *
   * Not retry-safe: a retried create can produce a duplicate order. If a call
   * times out, confirm with {@link getOrder} before retrying.
   *
   * @param request - The order to record
   * @param options - Per-request overrides (e.g. environment)
   * @returns OrderResponse with the recorded order
   *
   * @experimental Merchant Transactions is in active development.
   */
  async createOrder(request: CreateOrderRequest, options?: RequestOptions): Promise<OrderResponse> {
    validateUuid(request.merchantId, 'merchantId');
    validateRequired(request.orderId, 'orderId');
    validateMaxLength(request.orderId, 50, 'orderId');
    validateRequired(request.customerId, 'customerId');
    validateMaxLength(request.customerId, 50, 'customerId');
    validateRequired(request.transactionDate, 'transactionDate');
    validateRequired(request.completedDate, 'completedDate');
    validateRequired(request.origin, 'origin');
    validateRequired(request.destination, 'destination');
    validateRequired(request.currency, 'currency');
    validateRequired(request.lineItems, 'lineItems');

    if (!Array.isArray(request.lineItems) || request.lineItems.length < 1) {
      throw new ZiptaxValidationError('lineItems must contain at least 1 item');
    }

    request.lineItems.forEach((item, i) => {
      this.validateLineItem(item, `lineItems[${i}]`);
      validateRequired(item.tax, `lineItems[${i}].tax`);
    });

    return this.httpClient.post<OrderResponse>(
      '/merchant/order/create',
      request,
      this.merchantWriteConfig(options)
    );
  }

  /**
   * Record an order from a previously calculated cart.
   *
   * Only available for a TaxCloud-connected merchant: a self-managed cart
   * calculation is stateless and has no stored cart to convert.
   *
   * @param request - Merchant id, cartId, and your orderId
   * @param options - Per-request overrides (e.g. environment)
   * @returns OrderResponse with the recorded order
   *
   * @experimental Merchant Transactions is in active development.
   */
  async createOrderFromCart(
    request: CreateOrderFromCartRequest,
    options?: RequestOptions
  ): Promise<OrderResponse> {
    validateUuid(request.merchantId, 'merchantId');
    validateRequired(request.cartId, 'cartId');
    validateMaxLength(request.cartId, 50, 'cartId');
    validateRequired(request.orderId, 'orderId');
    validateMaxLength(request.orderId, 50, 'orderId');

    return this.httpClient.post<OrderResponse>(
      '/merchant/order/create-from-cart',
      request,
      this.merchantWriteConfig(options)
    );
  }

  /**
   * Retrieve an order.
   *
   * @param request - Merchant id, orderId, and optional `expand: 'refunds'`
   * @param options - Per-request overrides (e.g. environment)
   * @returns OrderResponse with the order
   *
   * @experimental Merchant Transactions is in active development.
   */
  async getOrder(request: GetOrderRequest, options?: RequestOptions): Promise<OrderResponse> {
    validateUuid(request.merchantId, 'merchantId');
    validateRequired(request.orderId, 'orderId');

    return this.httpClient.post<OrderResponse>(
      '/merchant/order/get',
      request,
      this.merchantRequestConfig(options)
    );
  }

  /**
   * Update an order's completed date, marking when the tax liability was
   * created.
   *
   * @param request - Merchant id, orderId, and the new completedDate
   * @param options - Per-request overrides (e.g. environment)
   * @returns OrderResponse with the updated order
   *
   * @experimental Merchant Transactions is in active development.
   */
  async updateOrder(request: UpdateOrderRequest, options?: RequestOptions): Promise<OrderResponse> {
    validateUuid(request.merchantId, 'merchantId');
    validateRequired(request.orderId, 'orderId');

    return this.httpClient.post<OrderResponse>(
      '/merchant/order/update',
      request,
      this.merchantWriteConfig(options)
    );
  }

  /**
   * Refund all or part of a recorded order.
   *
   * Omit `items` to refund the entire order. Never retry blindly: a duplicate
   * refund is a financial incident. If a call times out, confirm with
   * `getOrder({ ..., expand: 'refunds' })` before retrying.
   *
   * @param request - Merchant id, orderId, and optionally the items to refund
   * @param options - Per-request overrides (e.g. environment)
   * @returns RefundResponse with the refunded items
   *
   * @experimental Merchant Transactions is in active development.
   */
  async refundOrder(
    request: CreateRefundRequest,
    options?: RequestOptions
  ): Promise<RefundResponse> {
    validateUuid(request.merchantId, 'merchantId');
    validateRequired(request.orderId, 'orderId');

    if (request.items) {
      if (!Array.isArray(request.items)) {
        throw new ZiptaxValidationError('items must be an array');
      }
      request.items.forEach((item, i) => {
        validateRequired(item.itemId, `items[${i}].itemId`);
        validateMaxLength(item.itemId, 50, `items[${i}].itemId`);
        if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity)) {
          throw new ZiptaxValidationError(`items[${i}].quantity must be a finite number`);
        }
        if (item.quantity <= 0) {
          throw new ZiptaxValidationError(`items[${i}].quantity must be greater than 0`);
        }
      });
    }

    return this.httpClient.post<RefundResponse>(
      '/merchant/refund/create',
      request,
      this.merchantWriteConfig(options)
    );
  }

  // -------------------------------------------------------------------------
  // Exemption certificates
  // -------------------------------------------------------------------------

  /**
   * Store an exemption certificate for a customer.
   *
   * Carts and orders submitted with the same `customerId` are matched against
   * the certificate.
   *
   * @param request - Certificate details
   * @param options - Per-request overrides (e.g. environment)
   * @returns CertificateResponse with the stored certificate
   *
   * @experimental Merchant Transactions is in active development.
   */
  async createExemptionCertificate(
    request: CreateCertificateRequest,
    options?: RequestOptions
  ): Promise<CertificateResponse> {
    validateUuid(request.merchantId, 'merchantId');
    validateRequired(request.customerId, 'customerId');
    validateRequired(request.customerName, 'customerName');
    validateRequired(request.customerBusinessType, 'customerBusinessType');
    validateRequired(request.reason, 'reason');
    validateRequired(request.reasonDescription, 'reasonDescription');
    validateMaxLength(request.reasonDescription, 20, 'reasonDescription');
    validateRequired(request.address, 'address');
    validateRequired(request.states, 'states');

    if (!Array.isArray(request.states) || request.states.length < 1) {
      throw new ZiptaxValidationError('states must contain at least 1 state');
    }

    request.states.forEach((state, i) => {
      validateRequired(state.abbreviation, `states[${i}].abbreviation`);
      validatePattern(
        state.abbreviation,
        /^[A-Za-z]{2}$/,
        `states[${i}].abbreviation`,
        'two-letter state abbreviation'
      );
    });

    return this.httpClient.post<CertificateResponse>(
      '/merchant/cert/create',
      request,
      this.merchantWriteConfig(options)
    );
  }

  /**
   * Retrieve an exemption certificate.
   *
   * @param request - Merchant id and certificateId
   * @param options - Per-request overrides (e.g. environment)
   * @returns CertificateResponse with the certificate
   *
   * @experimental Merchant Transactions is in active development.
   */
  async getExemptionCertificate(
    request: GetCertificateRequest,
    options?: RequestOptions
  ): Promise<CertificateResponse> {
    validateUuid(request.merchantId, 'merchantId');
    validateRequired(request.certificateId, 'certificateId');

    return this.httpClient.post<CertificateResponse>(
      '/merchant/cert/get',
      request,
      this.merchantRequestConfig(options)
    );
  }

  /**
   * List a merchant's exemption certificates, newest first by default.
   *
   * Paginate by passing the previous response's `nextCursor` as `cursor`.
   *
   * @param request - Merchant id plus optional filters and pagination
   * @param options - Per-request overrides (e.g. environment)
   * @returns ListCertificatesResponse with one page of certificates
   *
   * @experimental Merchant Transactions is in active development.
   */
  async listExemptionCertificates(
    request: ListCertificatesRequest,
    options?: RequestOptions
  ): Promise<ListCertificatesResponse> {
    validateUuid(request.merchantId, 'merchantId');

    if (request.limit !== undefined) {
      validateNumberRange(request.limit, 1, 100, 'limit');
    }

    return this.httpClient.post<ListCertificatesResponse>(
      '/merchant/cert/list',
      request,
      this.merchantRequestConfig(options)
    );
  }

  /**
   * Delete (revoke) an exemption certificate.
   *
   * @param request - Merchant id and certificateId
   * @param options - Per-request overrides (e.g. environment)
   * @returns CertificateResponse for the deleted certificate
   *
   * @experimental Merchant Transactions is in active development.
   */
  async deleteExemptionCertificate(
    request: DeleteCertificateRequest,
    options?: RequestOptions
  ): Promise<CertificateResponse> {
    validateUuid(request.merchantId, 'merchantId');
    validateRequired(request.certificateId, 'certificateId');

    return this.httpClient.post<CertificateResponse>(
      '/merchant/cert/delete',
      request,
      this.merchantWriteConfig(options)
    );
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /**
   * Build the request config for a Merchant Transactions call: the X-ENV header
   * plus the retry policy appropriate to the operation.
   *
   * @param options - Per-request overrides from the caller
   * @param defaultRetry - Policy to use when the caller has not overridden it.
   *   Reads get the client default; non-idempotent writes get {@link NO_RETRY}.
   */
  private merchantRequestConfig(
    options?: RequestOptions,
    defaultRetry?: RetryOptions
  ): HTTPRequestOptions {
    const environment: MerchantEnvironment = options?.environment ?? this.config.environment;

    return {
      headers: { 'X-ENV': environment },
      retryOptions: options?.retryOptions ?? defaultRetry,
    };
  }

  /**
   * Request config for a non-idempotent merchant write.
   *
   * These are never retried automatically. A 502, a 504, or a client-side
   * timeout leaves the outcome genuinely unknown — the compliance service may
   * have committed the order, certificate, or refund before the connection
   * broke — so re-sending risks duplicating a financial transaction. The error
   * surfaces to the caller, who can confirm with a read before deciding.
   */
  private merchantWriteConfig(options?: RequestOptions): HTTPRequestOptions {
    return this.merchantRequestConfig(options, NO_RETRY);
  }

  /**
   * Validate the optional parameters shared by every rate lookup
   */
  private validateCommonRateParams(params: { taxabilityCode?: string; historical?: string }): void {
    if (params.taxabilityCode) {
      validatePattern(
        params.taxabilityCode,
        /^[A-Za-z0-9]{1,10}$/,
        'taxabilityCode',
        'up to 10 alphanumeric characters'
      );
    }

    if (params.historical) {
      validateHistorical(params.historical);
    }
  }

  /**
   * Build the query parameters shared by every rate lookup
   */
  private commonRateQuery(params: {
    taxabilityCode?: string;
    countryCode?: string;
    historical?: string;
    format?: string;
    adjustment?: string;
    addressDetailExtended?: boolean;
    shippingExtended?: boolean;
  }): Record<string, unknown> {
    return {
      taxabilityCode: params.taxabilityCode,
      countryCode: params.countryCode || 'USA',
      historical: params.historical,
      format: params.format || 'json',
      adjustment: params.adjustment,
      addressDetailExtended: params.addressDetailExtended,
      shippingExtended: params.shippingExtended,
    };
  }

  /**
   * Validate a cart or order line item
   */
  private validateLineItem(
    item: { index: number; itemId: string; price: number; quantity: number; tic?: number },
    path: string
  ): void {
    if (
      typeof item.index !== 'number' ||
      !Number.isInteger(item.index) ||
      item.index < 0 ||
      item.index > MAX_LINE_ITEM_INDEX
    ) {
      throw new ZiptaxValidationError(
        `${path}.index must be an integer between 0 and ${MAX_LINE_ITEM_INDEX}`
      );
    }

    validateRequired(item.itemId, `${path}.itemId`);
    validateMaxLength(item.itemId, 50, `${path}.itemId`);

    if (typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0) {
      throw new ZiptaxValidationError(`${path}.price must be a finite number of at least 0`);
    }

    if (
      typeof item.quantity !== 'number' ||
      !Number.isFinite(item.quantity) ||
      item.quantity < 0 ||
      item.quantity > MAX_LINE_ITEM_QUANTITY
    ) {
      throw new ZiptaxValidationError(
        `${path}.quantity must be a finite number between 0 and ${MAX_LINE_ITEM_QUANTITY}`
      );
    }

    if (item.tic !== undefined) {
      validateNumberRange(item.tic, 0, 100000, `${path}.tic`);
    }
  }

  /**
   * Validate the cart calculation request structure
   */
  private validateCartRequest(request: CalculateCartRequest): void {
    validateUuid(request.merchantId, 'merchantId');
    validateRequired(request.items, 'items');

    if (!Array.isArray(request.items) || request.items.length < 1) {
      throw new ZiptaxValidationError('items must contain at least 1 cart');
    }

    if (request.items.length > MAX_CARTS_PER_REQUEST) {
      throw new ZiptaxValidationError(`items must not exceed ${MAX_CARTS_PER_REQUEST} carts`);
    }

    request.items.forEach((cart, cartIndex) => {
      const path = `items[${cartIndex}]`;

      validateRequired(cart.customerId, `${path}.customerId`);
      validateMaxLength(cart.customerId, 50, `${path}.customerId`);

      if (cart.cartId !== undefined) {
        validateMaxLength(cart.cartId, 50, `${path}.cartId`);
      }

      validateRequired(cart.currency, `${path}.currency`);
      if (
        cart.currency.currencyCode !== undefined &&
        cart.currency.currencyCode !== 'USD' &&
        cart.currency.currencyCode !== 'CAD'
      ) {
        throw new ZiptaxValidationError(`${path}.currency.currencyCode must be 'USD' or 'CAD'`);
      }

      this.validateAddress(cart.origin, `${path}.origin`);
      this.validateAddress(cart.destination, `${path}.destination`);

      validateRequired(cart.lineItems, `${path}.lineItems`);
      if (!Array.isArray(cart.lineItems) || cart.lineItems.length < 1) {
        throw new ZiptaxValidationError(`${path}.lineItems must contain at least 1 item`);
      }

      const seenIndexes = new Set<number>();
      cart.lineItems.forEach((item, itemIndex) => {
        this.validateLineItem(item, `${path}.lineItems[${itemIndex}]`);

        if (seenIndexes.has(item.index)) {
          throw new ZiptaxValidationError(
            `${path}.lineItems contains duplicate index ${item.index}; each line item must have a unique index`
          );
        }
        seenIndexes.add(item.index);
      });
    });
  }

  /**
   * Validate a structured address
   */
  private validateAddress(
    address: { line1: string; city: string; state: string; zip: string } | undefined,
    path: string
  ): void {
    validateRequired(address, path);
    const addr = address as { line1: string; city: string; state: string; zip: string };

    validateRequired(addr.line1, `${path}.line1`);
    validateMaxLength(addr.line1, 128, `${path}.line1`);
    validateRequired(addr.city, `${path}.city`);
    validateMaxLength(addr.city, 50, `${path}.city`);
    validateRequired(addr.state, `${path}.state`);
    validateMaxLength(addr.state, 32, `${path}.state`);
    validateRequired(addr.zip, `${path}.zip`);
    validateMaxLength(addr.zip, 16, `${path}.zip`);
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
      environment: this.config.environment,
    };
  }
}
