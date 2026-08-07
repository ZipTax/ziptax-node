/**
 * Response models for ZipTax API v6.0
 * All field names use camelCase to match API conventions, except where the
 * API itself returns snake_case (account metrics, TIC data, system metadata).
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
  /**
   * Jurisdiction type. `US_*` for `countryCode=USA` and US territories, `GST` or
   * `PST` for `countryCode=CAN`. Open-ended: narrow with a `switch` or an
   * equality check rather than assuming the listed values are exhaustive.
   */
  jurType: V60JurisdictionType;
  /** Actual jurisdiction name (e.g., 'CA', 'ORANGE', 'IRVINE', 'Ontario') */
  jurName: string;
  /** Human-readable jurisdiction description */
  jurDescription: string;
  /** Tax code for jurisdiction */
  jurTaxCode: string | null;
}

/**
 * Jurisdiction types known to appear in `baseRates`.
 *
 * The US values come from the `countryCode=USA` path, which also serves the US
 * territories (PRI, ASM, GUM, MNP, VIR). `countryCode=CAN` is served by a
 * separate path that reports `GST` and `PST` instead.
 *
 * The `(string & {})` arm keeps the type open while preserving editor
 * completion for the known values. The published OpenAPI enum lists only the
 * `US_*` values and does not describe the Canadian path, so treating this as a
 * closed set would reject responses the API really returns.
 */
export type V60JurisdictionType =
  | 'US_STATE_SALES_TAX'
  | 'US_STATE_USE_TAX'
  | 'US_COUNTY_SALES_TAX'
  | 'US_COUNTY_USE_TAX'
  | 'US_CITY_SALES_TAX'
  | 'US_CITY_USE_TAX'
  | 'US_DISTRICT_SALES_TAX'
  | 'US_DISTRICT_USE_TAX'
  | 'GST'
  | 'PST'
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (string & {});

/**
 * Taxability indicator.
 *
 * - `Y` taxable
 * - `N` not taxable
 * - `L` only the labor or handling portion is taxable, when separately stated
 */
export type V60Taxability = 'Y' | 'N' | 'L';

/**
 * Service taxability information
 */
export interface V60Service {
  /** Service adjustment type */
  adjustmentType: string;
  /** Taxability indicator */
  taxable: V60Taxability;
  /** Service description */
  description: string;
}

/**
 * Extended shipping detail, returned when `shippingExtended` is requested
 */
export interface V60ShippingExtended {
  /** Two-letter state code the rule applies to */
  stateCode: string;
  /** Full state name */
  stateName: string;
  /**
   * General rule: EXEMPT, EXEMPT_WHEN_SEPARATELY_STATED, ITEM_SPECIFIC,
   * CONDITIONAL, or TAXABLE
   */
  rule: string;
  /** Whether shipping is exempt when stated separately from the item price */
  exemptWhenSeparatelyStated: string;
  /** Natural-language description of the rule */
  description: string;
}

/**
 * Shipping taxability information
 */
export interface V60Shipping {
  /**
   * Taxability indicator. Carries the freight taxability column verbatim, which
   * uses the same `Y`/`N`/`L` vocabulary as {@link V60Service.taxable}.
   *
   * Note that `description` does not currently distinguish `L`: the API maps
   * only `Y` and `N` to text and falls through to "Freight non-taxable"
   * otherwise, so read `taxable` rather than parsing `description`.
   */
  taxable: V60Taxability;
  /** Shipping adjustment type */
  adjustmentType: string;
  /** Shipping description */
  description: string;
  /** Extended shipping detail (only when `shippingExtended` is requested) */
  shippingExtended?: V60ShippingExtended;
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
  /** Label for this display rate line (e.g. the jurisdiction name) */
  name: string;
  /** Display rate value */
  rate: number;
}

/**
 * Tax types known to appear in `taxSummaries`.
 *
 * `SALES_TAX` and `USE_TAX` come from the `countryCode=USA` path. The Canadian
 * path reports `Sales`. Left open for the same reason as
 * {@link V60JurisdictionType}: the OpenAPI enum describes only the US path.
 */
export type V60TaxType =
  | 'SALES_TAX'
  | 'USE_TAX'
  | 'Sales'
  // eslint-disable-next-line @typescript-eslint/ban-types
  | (string & {});

/**
 * Tax rate summary
 */
export interface V60TaxSummary {
  /** Summary tax rate */
  rate: number;
  /** Tax type. `SALES_TAX` or `USE_TAX` for the US path, `Sales` for Canada */
  taxType: V60TaxType;
  /** Summary description */
  summaryName: string;
  /**
   * Rate breakdown. For Canada the entry names are the component taxes:
   * `GST`, `PST`, `HST`, or `QST`.
   */
  displayRates: V60DisplayRate[] | null;
}

/**
 * Geocoded address components, returned when `addressDetailExtended` is requested
 */
export interface V60AddressComponents {
  /** Country code */
  countryCode: string;
  /** Country name */
  countryName: string;
  /** Two-letter state code */
  stateCode: string;
  /** State name */
  state: string;
  /** County name */
  county: string;
  /** City name */
  city: string;
  /** Street name */
  street: string;
  /** Postal code (ZIP+4 when available) */
  postalCode: string;
  /** House number */
  houseNumber: string;
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
  /** Geocoding breakdown (only when `addressDetailExtended` is requested) */
  address?: V60AddressComponents;
}

/**
 * A single rate rule that applies to a product category in the resolved
 * jurisdiction
 */
export interface V60RateRule {
  /** Tax code for the jurisdiction the rule belongs to */
  jurTaxCode: string | null;
  /** Effective date (YYYYMMDD as an integer) */
  effectiveDt: number | null;
  /** Expiration date (YYYYMMDD as an integer) */
  expiresDt: number | null;
  /** Effective tax rate for the product in this jurisdiction */
  effectiveTaxRate: number | null;
  /** Portion of the price that is taxable, as a percentage */
  percentTaxable: number | null;
  /** Amount above which the item is exempt */
  exemptOver: number | null;
  /** Amount below which the item is exempt */
  exemptUnder: number | null;
  /** Amount above which the remaining portion becomes taxable */
  taxablePortionOver: number | null;
  /** Whether the rule uses destination sourcing */
  isDestinationTaxType: boolean | null;
  /** Whether the rule covers food and drug categories */
  isFoodDrug: boolean | null;
  /** Per-volume tax rate, for volume-based excise rules */
  perVolumeTaxRate?: number;
  /** Unit the per-volume rate applies to */
  perVolumeUnit?: string;
  /** Cap on tax per unit */
  rateCapPerUnit?: number;
}

/**
 * Taxability code detail for the requested product
 */
export interface V60TaxabilityCode {
  /** TIC identifier */
  id: string;
  /** Short title of the TIC category */
  title: string;
  /** Longer description of the TIC category */
  label: string;
  /** State FIPS code */
  stateFIPS: string;
  /** County FIPS code */
  countyFIPS: string;
  /** Rate action code (T00-T03) */
  rateActionCode: 'T00' | 'T01' | 'T02' | 'T03';
  /** Human-readable meaning of the rate action code */
  rateActionMessage: string;
  /** Rate rules that apply to this product in the resolved jurisdiction */
  rateRules: V60RateRule[] | null;
}

/**
 * Product-specific tax detail, returned when `taxabilityCode` is supplied
 */
export interface V60ProductDetail {
  /** Taxability code detail */
  taxabilityCode: V60TaxabilityCode;
}

/**
 * Response for v6.0 API - structured format with separate components
 */
export interface V60Response {
  /** Response metadata */
  metadata: V60Metadata;
  /** Base tax rates by jurisdiction */
  baseRates: V60BaseRate[] | null;
  /**
   * Service taxability information.
   *
   * Optional because the Canadian response omits the key entirely: that path
   * does not report service taxability. `| null` is kept for symmetry with
   * `sourcingRules`.
   */
  service?: V60Service | null;
  /** Shipping taxability information */
  shipping: V60Shipping;
  /**
   * Sourcing rules (origin vs destination).
   *
   * Optional because the Canadian response omits the key entirely: that path
   * has no origin/destination sourcing distinction. `| null` is kept as well so
   * an explicit null would also be representable.
   */
  sourcingRules?: V60SourcingRules | null;
  /** Tax rate summaries */
  taxSummaries: V60TaxSummary[] | null;
  /** Address details */
  addressDetail: V60AddressDetail;
  /** Product-specific detail (only when `taxabilityCode` is supplied) */
  productDetail?: V60ProductDetail;
}

/**
 * Individual tax rate result for a postal code
 */
export interface V60PostalCodeResult {
  /** Postal code */
  geoPostalCode: string;
  /** City name */
  geoCity: string;
  /** County name */
  geoCounty: string;
  /** State abbreviation */
  geoState: string;
  /** Total sales tax rate */
  taxSales: number;
  /** Total use tax rate */
  taxUse: number;
  /** Service taxability indicator */
  txbService: V60Taxability;
  /** Freight taxability indicator */
  txbFreight: V60Taxability;
  /** State sales tax rate */
  stateSalesTax: number;
  /** State use tax rate */
  stateUseTax: number;
  /** City sales tax rate */
  citySalesTax: number;
  /** City use tax rate */
  cityUseTax: number;
  /** City tax code */
  cityTaxCode: string;
  /** County sales tax rate */
  countySalesTax: number;
  /** County use tax rate */
  countyUseTax: number;
  /** County tax code */
  countyTaxCode: string;
  /** Total district sales tax rate */
  districtSalesTax: number;
  /** Total district use tax rate */
  districtUseTax: number;
  /** District 1 code */
  district1Code: string;
  /** District 1 sales tax rate */
  district1SalesTax: number;
  /** District 1 use tax rate */
  district1UseTax: number;
  /** District 2 code */
  district2Code: string;
  /** District 2 sales tax rate */
  district2SalesTax: number;
  /** District 2 use tax rate */
  district2UseTax: number;
  /** District 3 code */
  district3Code: string;
  /** District 3 sales tax rate */
  district3SalesTax: number;
  /** District 3 use tax rate */
  district3UseTax: number;
  /** District 4 code */
  district4Code: string;
  /** District 4 sales tax rate */
  district4SalesTax: number;
  /** District 4 use tax rate */
  district4UseTax: number;
  /** District 5 code */
  district5Code: string;
  /** District 5 sales tax rate */
  district5SalesTax: number;
  /** District 5 use tax rate */
  district5UseTax: number;
  /** Origin/destination indicator */
  originDestination: 'O' | 'D';
}

/**
 * Address detail information for postal code lookup
 */
export interface V60PostalCodeAddressDetail {
  /** Normalized address (limited for postal code lookups) */
  normalizedAddress: string;
  /** Incorporation status (limited for postal code lookups) */
  incorporated: string;
  /** Geocoded latitude (0 for postal code lookups) */
  geoLat: number;
  /** Geocoded longitude (0 for postal code lookups) */
  geoLng: number;
}

/**
 * Response for v6.0 postal code lookup - legacy format
 */
export interface V60PostalCodeResponse {
  /** API version */
  version: string;
  /** Response code (100=success) */
  rCode: number;
  /** Array of tax rate results for the postal code */
  results: V60PostalCodeResult[];
  /** Address details for postal code lookup */
  addressDetail: V60PostalCodeAddressDetail;
}

/**
 * Account metrics from `GET /account/v60/metrics`.
 * Field names are snake_case to match the API.
 */
export interface V60AccountMetrics {
  /** Number of requests consumed in the current period */
  request_count: number;
  /** Maximum requests allowed for the account in the current period */
  request_limit: number;
  /** Request usage as a percentage of the limit (0-100) */
  usage_percent: number;
  /** Whether the account is currently active */
  is_active: boolean;
  /** Account status or informational message */
  message: string;
}

/**
 * Full account usage from `GET /account/metrics`, broken out by quota type.
 * Field names are snake_case to match the API.
 */
export interface AccountUsageMetrics {
  /** Whether the account is currently active and able to make requests */
  is_active: boolean;
  /** Core (tax lookup) requests consumed in the current period */
  core_request_count: number;
  /** Maximum core requests allowed in the current period */
  core_request_limit: number;
  /** Core request usage as a percentage of the limit (0-100) */
  core_usage_percent: number;
  /** Geocoding requests consumed in the current period */
  geo_request_count: number;
  /** Maximum geocoding requests allowed in the current period */
  geo_request_limit: number;
  /** Geocoding request usage as a percentage of the limit (0-100) */
  geo_usage_percent: number;
  /** Whether the account has the `geo_enabled` entitlement */
  geo_enabled: boolean;
  /** Merchant requests consumed in the current period */
  merchant_request_count: number;
  /** Maximum merchant requests allowed in the current period */
  merchant_request_limit: number;
  /** Merchant request usage as a percentage of the limit (0-100) */
  merchant_usage_percent: number;
  /** Informational message about the account */
  message: string;
}

// ---------------------------------------------------------------------------
// System Models
// ---------------------------------------------------------------------------

/**
 * Per-component health detail
 */
export interface HealthComponents {
  /** Tax-data cache status */
  taxdata: 'ok' | 'empty' | 'partial';
  /** Number of tax-data records currently loaded in the in-memory cache */
  taxdata_count: number;
  /** DynamoDB connectivity status */
  dynamo: 'ok' | 'config_error' | 'connection_error';
}

/**
 * Response from `GET /system/health`
 */
export interface HealthResponse {
  /** Overall health of the API */
  status: string;
  /** Per-component health detail */
  components: HealthComponents;
}

/**
 * Response from `GET /system/metadata`
 */
export interface SystemMetadataResponse {
  /** Go runtime version the running binary was built with */
  go_version: string;
  /** Hostname of the instance serving the request */
  hostname: string;
}

// ---------------------------------------------------------------------------
// TIC Data Models
// ---------------------------------------------------------------------------

/**
 * A single Taxability Information Code record
 */
export interface TicData {
  /** TIC identifier (numeric string) */
  id: string;
  /** TIC code of this code's parent category; empty for top-level categories */
  parent: string;
  /** Short, localized human-readable title */
  title: string;
  /** Longer, localized description of what the TIC category covers */
  label: string;
  /** Non-localized (base English) title */
  nl_title: string;
  /** Non-localized (base English) description */
  nl_label: string;
}

/**
 * A TIC list entry, wrapping a single record
 */
export interface TicEntry {
  /** A single TIC record */
  tic: TicData;
}

/**
 * Response from `GET /data/tic`
 */
export interface TicDataResponse {
  /** Full list of Taxability Information Codes available to the account */
  tic_list: TicEntry[] | null;
}

// ---------------------------------------------------------------------------
// Product Code (TIC) Search Models
// ---------------------------------------------------------------------------

/**
 * Request payload for product code search and recommendation endpoints
 */
export interface ProductCodeSearchRequest {
  /** Natural language product description to search */
  query: string;
}

/**
 * A single product code search result ranked and scored by relevance
 */
export interface ProductCodeSearchResult {
  /** Taxability Information Code. Use as the taxabilityCode parameter
   *  in rate requests, or as `tic` on cart and order line items. */
  ticId: number;
  /** TIC label from the TIC data */
  label: string;
  /** Natural language label aligned with the full description */
  naturalLabel: string;
  /** Full description of the taxability code line item */
  description: string;
  /** Long-form documentation of the TIC code */
  documentation: string;
  /** Itemized rank for the result (1 = best match) */
  rank: number;
  /** Confidence score (0.0-1.0), independent of rank */
  score: number;
}

/**
 * Response from the product code search endpoint
 */
export interface ProductCodeSearchResponse {
  /** URL to the JSON Schema for this response */
  $schema?: string;
  /** Original search query sent in the request */
  query: string;
  /** Matching product codes ranked by relevance */
  results: ProductCodeSearchResult[] | null;
  /** Cursor for retrieving the next page of results, when more exist */
  nextCursor?: string;
}

/**
 * A single AI-powered product code recommendation
 */
export interface ProductCodeRecommendation {
  /** Prediction result status */
  status: 'success' | 'fail';
  /** Error formatted as "<code> - <message>" on failure; null on success */
  error: string | null;
  /** Recommended Taxability Information Code */
  ticId: number | null;
  /** TIC label from the TIC data */
  label: string | null;
  /** Natural language label aligned with the description */
  naturalLabel: string | null;
  /** Full description of the recommended TIC (snake_case to match API) */
  tic_description: string | null;
  /** Original product description sent in the query (snake_case to match API) */
  product_description: string | null;
}

/**
 * Response from the product code recommendation endpoint
 */
export interface ProductCodeRecommendationResponse {
  /** AI-powered product code recommendations */
  predictions: ProductCodeRecommendation[];
}
