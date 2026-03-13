/**
 * TaxCloud API models for order management
 * All field names use camelCase to match TaxCloud API conventions
 */

/**
 * TaxCloud address structure
 */
export interface TaxCloudAddress {
  /** Street address line 1 */
  line1: string;
  /** Street address line 2 (optional) */
  line2?: string;
  /** City */
  city: string;
  /** State abbreviation (2-letter) */
  state: string;
  /** ZIP code */
  zip: string;
  /** Country code (US or CA) */
  countryCode?: 'US' | 'CA';
}

/**
 * TaxCloud address in response format
 */
export interface TaxCloudAddressResponse extends TaxCloudAddress {
  /** Country code (always present in responses) */
  countryCode: 'US' | 'CA';
}

/**
 * Tax details for a line item
 */
export interface Tax {
  /** Tax amount */
  amount: number;
  /** Tax rate (decimal format) */
  rate: number;
}

/**
 * Refund tax details (amount only)
 */
export interface RefundTax {
  /** Tax amount for refund */
  amount: number;
}

/**
 * Currency information
 */
export interface Currency {
  /** ISO currency code */
  currencyCode: string;
}

/**
 * Currency response from API
 */
export interface CurrencyResponse {
  /** ISO currency code */
  currencyCode: string;
}

/**
 * Exemption information
 */
export interface Exemption {
  /** Exemption certificate ID */
  exemptionId: string | null;
  /** Whether item is exempt */
  isExempt: boolean | null;
}

/**
 * Cart item with tax information (for creating orders)
 */
export interface CartItemWithTax {
  /** Line item index */
  index: number;
  /** Item identifier */
  itemId: string;
  /** Item price */
  price: number;
  /** Item quantity */
  quantity: number;
  /** Tax information */
  tax: Tax;
  /** TaxCloud TIC (Taxability Information Code) */
  tic: number;
}

/**
 * Cart item response from API
 */
export interface CartItemWithTaxResponse extends CartItemWithTax {
  /** Tax information (always present in responses) */
  tax: Tax;
}

/**
 * Cart item for refund request
 */
export interface CartItemRefundWithTaxRequest {
  /** Item identifier */
  itemId: string;
  /** Quantity to refund */
  quantity: number;
}

/**
 * Cart item refund response from API
 */
export interface CartItemRefundWithTaxResponse {
  /** Line item index */
  index: number;
  /** Item identifier */
  itemId: string;
  /** Item price */
  price: number;
  /** Quantity refunded */
  quantity: number;
  /** Tax information for refund */
  tax: RefundTax;
  /** TaxCloud TIC (Taxability Information Code) */
  tic: number;
}

/**
 * Request to create a new order
 */
export interface CreateOrderRequest {
  /** Unique order identifier */
  orderId: string;
  /** Customer identifier */
  customerId: string;
  /** Transaction date (RFC3339 format) */
  transactionDate: string;
  /** Completed date (RFC3339 format) */
  completedDate: string;
  /** Origin address */
  origin: TaxCloudAddress;
  /** Destination address */
  destination: TaxCloudAddress;
  /** Line items with tax */
  lineItems: CartItemWithTax[];
  /** Currency information */
  currency: Currency;
  /** Sales channel (optional) */
  channel?: string | null;
  /** Whether delivered by seller (optional) */
  deliveredBySeller?: boolean;
  /** Whether to exclude from filing (optional) */
  excludeFromFiling?: boolean;
  /** Exemption information (optional) */
  exemption?: Exemption;
}

/**
 * Response from creating or retrieving an order
 */
export interface OrderResponse {
  /** Unique order identifier */
  orderId: string;
  /** Customer identifier */
  customerId: string;
  /** TaxCloud connection ID */
  connectionId: string;
  /** Transaction date (RFC3339 format) */
  transactionDate: string;
  /** Completed date (RFC3339 format) */
  completedDate: string;
  /** Origin address */
  origin: TaxCloudAddressResponse;
  /** Destination address */
  destination: TaxCloudAddressResponse;
  /** Line items with tax */
  lineItems: CartItemWithTaxResponse[];
  /** Currency information */
  currency: CurrencyResponse;
  /** Sales channel */
  channel: string | null;
  /** Whether delivered by seller */
  deliveredBySeller: boolean;
  /** Whether to exclude from filing */
  excludeFromFiling: boolean;
  /** Exemption information */
  exemption: Exemption;
}

/**
 * Request to update an existing order
 */
export interface UpdateOrderRequest {
  /** Updated completed date (RFC3339 format) */
  completedDate: string;
}

/**
 * Request to create an order from a previously calculated TaxCloud cart.
 * The cartId comes from a previous calculateCart response
 * (TaxCloudCartItemResponse.cartId) when TaxCloud credentials are configured.
 */
export interface CreateOrderFromCartRequest {
  /** Cart ID from a previous TaxCloud calculateCart response */
  cartId: string;
  /** User's internal order ID for cross-referencing */
  orderId: string;
}

/**
 * Request to refund an order
 * If items is empty or omitted, the entire order will be refunded.
 */
export interface RefundTransactionRequest {
  /** Items to refund (empty or omitted means full refund) */
  items?: CartItemRefundWithTaxRequest[];
  /** Include only if this return is a change to a previously filed sales tax return */
  returnedDate?: string;
}

/**
 * Response from refund operation
 */
export interface RefundTransactionResponse {
  /** TaxCloud connection ID */
  connectionId: string;
  /** When refund was created (RFC3339 format) */
  createdDate: string;
  /** Refunded items with tax details */
  items: CartItemRefundWithTaxResponse[];
  /** When items were returned (RFC3339 format) */
  returnedDate?: string;
}

// ---------------------------------------------------------------------------
// TaxCloud Cart Tax Calculation Response Models
// ---------------------------------------------------------------------------

/**
 * A line item in the TaxCloud cart response with calculated tax rate and amount
 */
export interface TaxCloudCartLineItemResponse {
  /** Position/index of item within the cart (0-based) */
  index: number;
  /** Unique identifier for the line item (echoed from request) */
  itemId: string;
  /** Unit price of the item (echoed from request) */
  price: number;
  /** Quantity of the item (echoed from request) */
  quantity: number;
  /** Calculated tax information for this line item */
  tax: Tax;
  /** Taxability Information Code (mapped from taxabilityCode, nullable) */
  tic: number | null;
}

/**
 * A single cart response from TaxCloud with calculated tax information
 */
export interface TaxCloudCartItemResponse {
  /** ID representing this cart (auto-generated) */
  cartId: string;
  /** Customer identifier (echoed from request) */
  customerId: string;
  /** Currency information */
  currency: CurrencyResponse;
  /** Whether the seller directly delivered the order */
  deliveredBySeller: boolean;
  /** Destination address (structured format from TaxCloud) */
  destination: TaxCloudAddressResponse;
  /** Origin address (structured format from TaxCloud) */
  origin: TaxCloudAddressResponse;
  /** Exemption information */
  exemption: Exemption;
  /** Array of line items with calculated tax information */
  lineItems: TaxCloudCartLineItemResponse[];
}

/**
 * Response from TaxCloud cart tax calculation.
 * Returned by calculateCart when client is configured with TaxCloud credentials.
 */
export interface TaxCloudCalculateCartResponse {
  /** TaxCloud Connection ID used for this cart calculation */
  connectionId: string;
  /** Array of cart results with calculated tax information */
  items: TaxCloudCartItemResponse[];
  /** RFC3339 datetime string the cart was calculated for */
  transactionDate: string;
}
