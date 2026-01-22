/**
 * Configuration types and defaults for ZipTax SDK
 */

import { RetryOptions } from './utils/retry';

/**
 * Configuration options for ZipTax client
 */
export interface ZiptaxConfig {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for API requests (default: https://api.zip-tax.com/) */
  baseURL?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Retry configuration */
  retryOptions?: RetryOptions;
  /** Enable request/response logging (default: false) */
  enableLogging?: boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  baseURL: 'https://api.zip-tax.com',
  timeout: 30000,
  enableLogging: false,
};

/**
 * Query parameters for GetSalesTaxByAddress
 */
export interface GetSalesTaxByAddressParams {
  /** Full or partial street address for geocoding */
  address: string;
  /** Taxability Code (product or service code) */
  taxabilityCode?: string;
  /** Country code (default: USA) */
  countryCode?: 'USA' | 'CAN';
  /** Historical date for rates (YYYY-MM format) */
  historical?: string;
  /** Response format (default: json) */
  format?: 'json' | 'xml';
}

/**
 * Query parameters for GetSalesTaxByGeoLocation
 */
export interface GetSalesTaxByGeoLocationParams {
  /** Latitude for geolocation */
  lat: string;
  /** Longitude for geolocation */
  lng: string;
  /** Country code (default: USA) */
  countryCode?: 'USA' | 'CAN';
  /** Historical date for rates (YYYY-MM format) */
  historical?: string;
  /** Response format (default: json) */
  format?: 'json' | 'xml';
}

/**
 * Query parameters for GetAccountMetrics
 */
export interface GetAccountMetricsParams {
  /** Response format (default: json) */
  format?: 'json' | 'xml';
}
