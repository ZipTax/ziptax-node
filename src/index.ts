/**
 * ZipTax Node.js SDK
 * Official SDK for the ZipTax API
 */

// Export main client
export { ZiptaxClient } from './client.js';

// Export configuration types
export type {
  ZiptaxConfig,
  RequestOptions,
  MerchantEnvironment,
  CountryCode,
  RateAdjustment,
  ResponseFormat,
  CommonRateParams,
  GetSalesTaxByAddressParams,
  GetSalesTaxByGeoLocationParams,
  GetRatesByPostalCodeParams,
  GetAccountMetricsParams,
  GetTicDataParams,
} from './config.js';

// Export rate lookup, account, system, and TIC models
export type {
  V60Response,
  V60Metadata,
  V60ResponseInfo,
  V60BaseRate,
  V60JurisdictionType,
  V60TaxType,
  V60Taxability,
  V60Service,
  V60Shipping,
  V60ShippingExtended,
  V60SourcingRules,
  V60TaxSummary,
  V60DisplayRate,
  V60AddressDetail,
  V60AddressComponents,
  V60ProductDetail,
  V60TaxabilityCode,
  V60RateRule,
  V60PostalCodeResponse,
  V60PostalCodeResult,
  V60PostalCodeAddressDetail,
  V60AccountMetrics,
  AccountUsageMetrics,
  HealthResponse,
  HealthComponents,
  SystemMetadataResponse,
  TicData,
  TicEntry,
  TicDataResponse,
  ProductCodeSearchRequest,
  ProductCodeSearchResult,
  ProductCodeSearchResponse,
  ProductCodeRecommendation,
  ProductCodeRecommendationResponse,
} from './models/index.js';

// Export merchant management models
export type {
  MerchantType,
  MerchantStatus,
  Merchant,
  MerchantUpdate,
  MerchantMutationResponse,
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
} from './models/index.js';

// Export merchant transaction models
export type {
  TaxCloudAddress,
  TaxCloudAddressResponse,
  Tax,
  RefundTax,
  Currency,
  CurrencyResponse,
  Exemption,
  Discounts,
  LineItemDiscount,
  OrderLevelDiscount,
  CartLineItem,
  Cart,
  CalculateCartRequest,
  CartLineItemResponse,
  CartResponse,
  CalculateCartResponse,
  SelfManagedCartResponse,
  SelfManagedCalculateCartResponse,
  AnyCalculateCartResponse,
  OrderKind,
  OrderLineItem,
  CreateOrderRequest,
  CreateOrderFromCartRequest,
  GetOrderRequest,
  UpdateOrderRequest,
  OrderResponse,
  RefundItem,
  CreateRefundRequest,
  RefundItemResponse,
  RefundResponse,
  CustomerBusinessType,
  ExemptionReason,
  ExemptState,
  CreateCertificateRequest,
  GetCertificateRequest,
  DeleteCertificateRequest,
  ListCertificatesRequest,
  CertificateResponse,
  ListCertificatesResponse,
} from './models/index.js';

// Export cart response type guard
export { isTaxCloudCartResponse } from './models/index.js';

// Export webhook models
export type {
  WebhookEventType,
  WebhookLocality,
  WebhookEvent,
  RateUpdateDetail,
  RateUpdatedData,
  RateUpdatedEvent,
  AnyWebhookEvent,
} from './models/index.js';

// Export webhook helpers
export {
  WEBHOOK_SIGNATURE_HEADER,
  computeWebhookSignature,
  verifyWebhookSignature,
  parseWebhookEvent,
  parseWebhookTimestamp,
} from './utils/webhooks.js';

// Export exceptions
export {
  ZiptaxError,
  ZiptaxAPIError,
  ZiptaxAuthenticationError,
  ZiptaxRateLimitError,
  ZiptaxValidationError,
  ZiptaxNetworkError,
  ZiptaxRetryError,
  ZiptaxConfigurationError,
} from './exceptions.js';

// Export retry options type and the named policies the client applies
export type { RetryOptions } from './utils/index.js';
export { NO_RETRY, RETRY_ON_NO_RESPONSE } from './utils/retry.js';
