/**
 * ZipTax Node.js SDK
 * Official SDK for the ZipTax API
 */

// Export main client
export { ZiptaxClient } from './client';

// Export configuration types
export type {
  ZiptaxConfig,
  GetSalesTaxByAddressParams,
  GetSalesTaxByGeoLocationParams,
  GetAccountMetricsParams,
} from './config';

// Export response models
export type {
  V60Response,
  V60Metadata,
  V60ResponseInfo,
  V60BaseRate,
  V60Service,
  V60Shipping,
  V60SourcingRules,
  V60TaxSummary,
  V60DisplayRate,
  V60AddressDetail,
  V60AccountMetrics,
} from './models';

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
} from './exceptions';

// Export retry options type
export type { RetryOptions } from './utils';
