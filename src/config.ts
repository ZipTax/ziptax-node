/**
 * Configuration types and defaults for ZipTax SDK
 */

import { RetryOptions } from './utils/retry';

/**
 * Merchant environment targeted by Merchant Transactions endpoints.
 * Sent as the `X-ENV` header. Defaults to LIVE.
 */
export type MerchantEnvironment = 'LIVE' | 'TEST';

/**
 * Configuration options for ZipTax client
 */
export interface ZiptaxConfig {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for API requests (default: https://api.zip-tax.com) */
  baseURL?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Retry configuration */
  retryOptions?: RetryOptions;
  /** Enable request/response logging (default: false) */
  enableLogging?: boolean;
  /**
   * Default environment for Merchant Transactions endpoints (default: LIVE).
   * Individual calls can override this per request.
   */
  environment?: MerchantEnvironment;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  baseURL: 'https://api.zip-tax.com',
  timeout: 30000,
  enableLogging: false,
  environment: 'LIVE' as MerchantEnvironment,
};

/**
 * Per-request options for Merchant Transactions endpoints
 */
export interface RequestOptions {
  /** Override the client's default environment for this call */
  environment?: MerchantEnvironment;
}

/**
 * Country of a rate lookup. 'CAN' requires the `rate_loc_can` entitlement;
 * US territories are looked up via the USA path and need no extra entitlement.
 */
export type CountryCode = 'USA' | 'CAN' | 'PRI' | 'ASM' | 'GUM' | 'MNP' | 'VIR';

/**
 * Sourcing / unincorporated-area handling for rate lookups.
 * 'origin' and 'destination' are accepted but do not currently change the
 * resolved result.
 */
export type RateAdjustment = 'auto' | 'origin' | 'destination';

/**
 * Response serialization format
 */
export type ResponseFormat = 'json' | 'xml';

/**
 * Optional parameters shared by every v6.0 rate lookup
 */
export interface CommonRateParams {
  /** Product Taxability Information Code (TIC), e.g. '20010' or 'CIR00001' */
  taxabilityCode?: string;
  /** Country of the lookup (default: USA) */
  countryCode?: CountryCode;
  /** Historical period to price against, YYYYMM (e.g. '202401') */
  historical?: string;
  /** Response format (default: json) */
  format?: ResponseFormat;
  /** Sourcing / unincorporated-area handling (default: auto) */
  adjustment?: RateAdjustment;
  /** Return a full geocoding breakdown in `addressDetail.address` (default: false) */
  addressDetailExtended?: boolean;
  /** Return the detailed shipping object in `shipping.shippingExtended` (default: false) */
  shippingExtended?: boolean;
}

/**
 * Query parameters for GetSalesTaxByAddress
 */
export interface GetSalesTaxByAddressParams extends CommonRateParams {
  /** Full or partial street address for geocoding (max 100 characters) */
  address: string;
  /** City name, to narrow the lookup */
  city?: string;
  /** State name or two-letter abbreviation, to disambiguate the location */
  state?: string;
  /** Two-letter state code (e.g. 'CA'). Alternative to `state` */
  stateCode?: string;
  /** County name, to refine the lookup */
  county?: string;
  /** Single-article item total in dollars, for Tennessee Single Article Tax */
  satItemTotal?: number;
}

/**
 * Query parameters for GetSalesTaxByGeoLocation
 */
export interface GetSalesTaxByGeoLocationParams extends CommonRateParams {
  /** Latitude of the point (-90 to 90) */
  lat: number;
  /** Longitude of the point (-180 to 180) */
  lng: number;
}

/**
 * Query parameters for GetRatesByPostalCode
 */
export interface GetRatesByPostalCodeParams extends CommonRateParams {
  /** US postal code (5-digit format, e.g. '92694') */
  postalcode: string;
  /** State name or two-letter abbreviation, to narrow overlapping jurisdictions */
  state?: string;
}

/**
 * Query parameters for GetAccountMetrics
 */
export interface GetAccountMetricsParams {
  /** Response format (default: json) */
  format?: ResponseFormat;
}

/**
 * Query parameters for GetTicData
 */
export interface GetTicDataParams {
  /** Response format (default: json) */
  format?: ResponseFormat;
}
