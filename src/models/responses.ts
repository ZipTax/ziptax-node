/**
 * Response models for ZipTax API v6.0
 * All field names use camelCase to match API conventions
 */

/**
 * Response information nested in metadata
 */
export interface V60ResponseInfo {
  /** Response code (100=success) */
  code: number;
  /** Response code name */
  name: string;
  /** Response message */
  message: string;
  /** Schema definition URL */
  definition: string;
}

/**
 * Metadata for v6.0 response
 */
export interface V60Metadata {
  /** API version */
  version: string;
  /** Response information (nested object) */
  response: V60ResponseInfo;
}

/**
 * Base tax rate for a specific jurisdiction
 */
export interface V60BaseRate {
  /** Tax rate (decimal format, e.g., 0.0775 for 7.75%) */
  rate: number;
  /** Rate identifier from tax table (optional) */
  rateId?: string;
  /** Jurisdiction type (e.g., US_STATE_SALES_TAX, US_COUNTY_SALES_TAX) */
  jurType: string;
  /** Actual jurisdiction name (e.g., 'CA', 'ORANGE', 'IRVINE') */
  jurName: string;
  /** Human-readable jurisdiction description (optional) */
  jurDescription?: string;
  /** Tax code for jurisdiction (optional) */
  jurTaxCode?: string;
}

/**
 * Service taxability information
 */
export interface V60Service {
  /** Service adjustment type */
  adjustmentType: string;
  /** Taxability indicator */
  taxable: 'Y' | 'N';
  /** Service description */
  description: string;
}

/**
 * Shipping taxability information
 */
export interface V60Shipping {
  /** Shipping adjustment type */
  adjustmentType: string;
  /** Taxability indicator */
  taxable: 'Y' | 'N';
  /** Shipping description */
  description: string;
}

/**
 * Sourcing rules (origin vs destination)
 */
export interface V60SourcingRules {
  /** Sourcing rules type */
  adjustmentType: string;
  /** Sourcing rules description */
  description: string;
  /** Origin/destination indicator */
  value: 'O' | 'D';
}

/**
 * Display rate breakdown within tax summary
 */
export interface V60DisplayRate {
  /** Display rate name */
  name: string;
  /** Display rate value */
  rate: number;
}

/**
 * Tax rate summary
 */
export interface V60TaxSummary {
  /** Summary tax rate */
  rate: number;
  /** Tax type (e.g., SALES_TAX, USE_TAX) */
  taxType: string;
  /** Summary description */
  summaryName: string;
  /** Array of display rate breakdowns */
  displayRates: V60DisplayRate[];
}

/**
 * Address detail information for v6.0
 */
export interface V60AddressDetail {
  /** Normalized address */
  normalizedAddress: string;
  /** Incorporation status */
  incorporated: 'true' | 'false';
  /** Geocoded latitude */
  geoLat: number;
  /** Geocoded longitude */
  geoLng: number;
}

/**
 * Response for v6.0 API - structured format with separate components
 */
export interface V60Response {
  /** Response metadata */
  metadata: V60Metadata;
  /** Base tax rates by jurisdiction (optional) */
  baseRates?: V60BaseRate[];
  /** Service taxability information */
  service: V60Service;
  /** Shipping taxability information */
  shipping: V60Shipping;
  /** Sourcing rules (origin vs destination) (optional) */
  sourcingRules?: V60SourcingRules;
  /** Tax rate summaries (optional) */
  taxSummaries?: V60TaxSummary[];
  /** Address details */
  addressDetail: V60AddressDetail;
}

/**
 * Account metrics by API key
 */
export interface V60AccountMetrics {
  /** Number of core API requests made */
  core_request_count: number;
  /** Maximum allowed core API requests */
  core_request_limit: number;
  /** Percentage of core request limit used */
  core_usage_percent: number;
  /** Whether geolocation features are enabled */
  geo_enabled: boolean;
  /** Number of geolocation requests made */
  geo_request_count: number;
  /** Maximum allowed geolocation requests */
  geo_request_limit: number;
  /** Percentage of geolocation request limit used */
  geo_usage_percent: number;
  /** Whether the account is currently active */
  is_active: boolean;
  /** Account status or informational message */
  message: string;
}
