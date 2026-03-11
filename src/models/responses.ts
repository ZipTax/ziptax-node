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
  txbService: 'Y' | 'N';
  /** Freight taxability indicator */
  txbFreight: 'Y' | 'N';
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
 * Account metrics by API key
 */
export interface V60AccountMetrics {
  /** Number of API requests made */
  request_count: number;
  /** Maximum allowed API requests */
  request_limit: number;
  /** Percentage of request limit used */
  usage_percent: number;
  /** Whether the account is currently active */
  is_active: boolean;
  /** Account status or informational message */
  message: string;
}

// ---------------------------------------------------------------------------
// Cart Tax Calculation Models (ZipTax API)
// ---------------------------------------------------------------------------

/**
 * Simple address structure for cart tax calculation (single string format)
 */
export interface CartAddress {
  /** Full address string for geocoding */
  address: string;
}

/**
 * Currency information for cart request
 */
export interface CartCurrency {
  /** ISO currency code (must be USD) */
  currencyCode: 'USD';
}

/**
 * A line item in the cart request with product details for tax calculation
 */
export interface CartLineItem {
  /** Unique identifier for the line item */
  itemId: string;
  /** Unit price of the item (must be positive, greater than 0) */
  price: number;
  /** Quantity of the item (must be positive, greater than 0) */
  quantity: number;
  /** Taxability code for product-specific tax rules (optional) */
  taxabilityCode?: number;
}

/**
 * A single cart containing customer info, addresses, currency, and line items
 */
export interface CartItem {
  /** Customer identifier */
  customerId: string;
  /** Currency information (must be USD) */
  currency: CartCurrency;
  /** Destination address used for tax calculation */
  destination: CartAddress;
  /** Origin address of the seller/shipper */
  origin: CartAddress;
  /** Array of line items in the cart (1-250 items) */
  lineItems: CartLineItem[];
}

/**
 * Request payload for calculating sales tax on a shopping cart.
 * Wraps a single cart item in an 'items' array.
 */
export interface CalculateCartRequest {
  /** Array of cart items (must contain exactly 1 element) */
  items: CartItem[];
}

/**
 * Calculated tax details for a cart line item
 */
export interface CartTax {
  /** Calculated sales tax rate */
  rate: number;
  /** Calculated tax amount: (price x quantity) x rate */
  amount: number;
}

/**
 * A line item in the cart response with calculated tax rate and amount
 */
export interface CartLineItemResponse {
  /** Unique identifier for the line item (echoed from request) */
  itemId: string;
  /** Unit price of the item (echoed from request) */
  price: number;
  /** Quantity of the item (echoed from request) */
  quantity: number;
  /** Calculated tax information for this line item */
  tax: CartTax;
}

/**
 * A single cart response with calculated tax information per line item
 */
export interface CartItemResponse {
  /** Server-generated UUID identifying this cart calculation */
  cartId: string;
  /** Customer identifier (echoed from request) */
  customerId: string;
  /** Destination address (echoed from request) */
  destination: CartAddress;
  /** Origin address (echoed from request) */
  origin: CartAddress;
  /** Array of line items with calculated tax information */
  lineItems: CartLineItemResponse[];
}

/**
 * Response from cart tax calculation containing per-item tax details
 */
export interface CalculateCartResponse {
  /** Array of cart results (mirrors request items array order) */
  items: CartItemResponse[];
}
