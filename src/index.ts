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
  GetRatesByPostalCodeParams,
  GetAccountMetricsParams,
} from './config';

// Export ZipTax response models
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
  V60PostalCodeResponse,
  V60PostalCodeResult,
  V60PostalCodeAddressDetail,
  V60AccountMetrics,
  CartAddress,
  CartCurrency,
  CartLineItem,
  CartItem,
  CalculateCartRequest,
  CartTax,
  CartLineItemResponse,
  CartItemResponse,
  CalculateCartResponse,
} from './models';

// Export TaxCloud models
export type {
  TaxCloudAddress,
  TaxCloudAddressResponse,
  Tax,
  RefundTax,
  Currency,
  CurrencyResponse,
  Exemption,
  CartItemWithTax,
  CartItemWithTaxResponse,
  CartItemRefundWithTaxRequest,
  CartItemRefundWithTaxResponse,
  CreateOrderRequest,
  CreateOrderFromCartRequest,
  OrderResponse,
  UpdateOrderRequest,
  RefundTransactionRequest,
  RefundTransactionResponse,
  TaxCloudCartLineItemResponse,
  TaxCloudCartItemResponse,
  TaxCloudCalculateCartResponse,
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
