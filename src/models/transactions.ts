/**
 * Merchant Transactions models: cart calculation, orders, exemption
 * certificates, and refunds.
 *
 * Every operation runs against a single merchant identified by `merchantId`.
 * Compliance credentials are resolved server-side from the merchant's stored
 * TaxCloud credentials and are never sent in the request.
 *
 * Merchant Transactions is in active development. Endpoints, request bodies,
 * and responses may change before general availability.
 *
 * @experimental
 */

/**
 * Structured address used by cart, order, and certificate payloads
 */
export interface TaxCloudAddress {
  /** Street number and name, PO Box, or building (max 128 characters) */
  line1: string;
  /** Apartment, suite, or unit number (max 128 characters) */
  line2?: string;
  /** City or post-town (max 50 characters) */
  city: string;
  /** State or province, as a two-letter abbreviation (max 32 characters) */
  state: string;
  /** Postal code; five-digit (55401) and ZIP+4 (55401-2427) are accepted */
  zip: string;
  /** ISO 3166-1 alpha-2 country code */
  countryCode?: 'US' | 'CA';
}

/**
 * Address as returned in responses, where countryCode is always present
 */
export interface TaxCloudAddressResponse extends TaxCloudAddress {
  /** ISO 3166-1 alpha-2 country code */
  countryCode: 'US' | 'CA';
}

/**
 * Tax rate and amount for a line item
 */
export interface Tax {
  /** Combined tax rate applied, as a decimal fraction (e.g. 0.0875) */
  rate: number;
  /** Calculated tax amount, in the transaction currency */
  amount: number;
}

/**
 * Refund tax detail (amount only)
 */
export interface RefundTax {
  /** Tax amount refunded for the item */
  amount: number;
}

/**
 * Currency the line-item prices are denominated in
 */
export interface Currency {
  /** ISO 4217 currency code (defaults to USD when omitted) */
  currencyCode?: 'USD' | 'CAD';
}

/**
 * Currency as returned in responses
 */
export interface CurrencyResponse {
  /** ISO 4217 currency code */
  currencyCode: 'USD' | 'CAD';
}

/**
 * Exemption information for the customer
 */
export interface Exemption {
  /** Identifier of an exemption certificate previously created for the customer */
  exemptionId?: string | null;
  /** Whether the customer is exempt. Assumed true when exemptionId is set */
  isExempt?: boolean | null;
}

/**
 * A discount applied to a specific line item
 */
export interface LineItemDiscount {
  /** The itemId of the line item this discount applies to */
  itemId: string;
  /** Whether `value` is a fraction of the price or a fixed amount */
  type: 'percentage' | 'amount';
  /** Decimal fraction between 0 and 1 for 'percentage', or a currency amount */
  value: number;
}

/**
 * A discount applied to the entire order, after line-item discounts
 */
export interface OrderLevelDiscount {
  /** Whether `value` is a fraction of the order total or a fixed amount */
  type: 'percentage' | 'amount';
  /** Decimal fraction between 0 and 1 for 'percentage', or a currency amount */
  value: number;
}

/**
 * Line-item and order-level discounts to apply
 */
export interface Discounts {
  /** Discounts applied to specific line items, before any order-level discount */
  lineItemDiscounts?: LineItemDiscount[] | null;
  /** A discount applied to the entire order, after line-item discounts */
  orderDiscount?: OrderLevelDiscount;
}

/**
 * A line item in a cart calculation request
 */
export interface CartLineItem {
  /** Zero-based position within the cart; must be unique (0-500) */
  index: number;
  /** Your unique identifier for the line item, e.g. a SKU (max 50 characters) */
  itemId: string;
  /** Unit price in the cart's currency */
  price: number;
  /** Quantity; fractional values are allowed (max 99999.9999) */
  quantity: number;
  /** Taxability Information Code classifying the product (0-100000) */
  tic?: number;
  /** Unique ID of the product in the merchant's TaxCloud product catalog */
  productId?: string;
}

/**
 * A single cart to calculate tax for
 */
export interface Cart {
  /** Your identifier for this cart (max 50 characters). Generated when omitted */
  cartId?: string;
  /** Your identifier for the customer (max 50 characters) */
  customerId: string;
  /** The ship-from address of the sale */
  origin: TaxCloudAddress;
  /** The ship-to address of the sale; tax is generally calculated for this one */
  destination: TaxCloudAddress;
  /** The currency the line-item prices are denominated in */
  currency: Currency;
  /** The line items in the cart */
  lineItems: CartLineItem[];
  /** Whether the seller delivers directly rather than via common carrier */
  deliveredBySeller?: boolean;
  /** Optional exemption information for the customer */
  exemption?: Exemption;
  /** Optional line-item and order-level discounts */
  discounts?: Discounts;
}

/**
 * Request to calculate tax for one or more carts
 *
 * @experimental
 */
export interface CalculateCartRequest {
  /** UUID of the merchant to calculate on behalf of */
  merchantId: string;
  /** The carts to calculate tax for (1-100) */
  items: Cart[];
  /** RFC3339 datetime to calculate for. Defaults to the current time */
  transactionDate?: string;
}

/**
 * A calculated line item in a cart response
 */
export interface CartLineItemResponse {
  /** Zero-based position within the cart */
  index: number;
  /** Your identifier for the line item, as submitted */
  itemId: string;
  /** The unit price tax was calculated on (discounted, when discounts applied) */
  price: number;
  /** The original pre-discount unit price */
  originalPrice: number;
  /** Quantity of the item */
  quantity: number;
  /** Taxability Information Code the item was calculated under */
  tic: number | null;
  /** The tax rate and amount calculated for this line item */
  tax: Tax;
  /** Unique ID of the product in the merchant's TaxCloud catalog */
  productId?: string;
}

/**
 * A single calculated cart, as returned for a TaxCloud-connected merchant
 */
export interface CartResponse {
  /** Identifier of the calculated cart. Pass to createOrderFromCart */
  cartId: string;
  /** Your identifier for the customer, as submitted */
  customerId: string;
  /** The ship-from address, as submitted */
  origin: TaxCloudAddressResponse;
  /** The ship-to address, as submitted */
  destination: TaxCloudAddressResponse;
  /** The currency the prices and tax amounts are denominated in */
  currency: CurrencyResponse;
  /** The submitted line items, each with calculated tax */
  lineItems: CartLineItemResponse[] | null;
  /** Whether the seller delivers the order directly */
  deliveredBySeller: boolean;
  /** The exemption information applied to the calculation */
  exemption: Exemption;
}

/**
 * Cart calculation response for a TaxCloud-connected merchant
 *
 * @experimental
 */
export interface CalculateCartResponse {
  /** The TaxCloud connection the calculation ran under */
  connectionId: string;
  /** One calculated cart per submitted cart, in the same order */
  items: CartResponse[] | null;
  /** RFC3339 datetime the carts were calculated for */
  transactionDate?: string;
}

/**
 * A single calculated cart, as returned for a self-managed merchant.
 *
 * Self-managed calculation is stateless: nothing is stored, so the result
 * cannot be turned into an order. Discounts and exemptions are not supported.
 */
export interface SelfManagedCartResponse {
  /** The cartId you submitted, or a generated one */
  cartId: string;
  /** Your identifier for the customer, as submitted */
  customerId: string;
  /** The ship-from address, as submitted */
  origin: TaxCloudAddressResponse;
  /** The ship-to address, as submitted */
  destination: TaxCloudAddressResponse;
  /** The currency the prices and tax amounts are denominated in */
  currency: CurrencyResponse;
  /** The submitted line items, each with calculated tax */
  lineItems: CartLineItemResponse[] | null;
}

/**
 * Cart calculation response for a self-managed merchant, calculated by the
 * Ziptax rate engine rather than TaxCloud.
 *
 * @experimental Self-managed cart calculation is in active development.
 */
export interface SelfManagedCalculateCartResponse {
  /** One calculated cart per submitted cart, in the same order */
  items: SelfManagedCartResponse[] | null;
}

/**
 * Cart calculation result. Which shape comes back depends on the merchant's
 * compliance model: a TaxCloud-connected merchant returns
 * {@link CalculateCartResponse} (with `connectionId`), a self-managed merchant
 * returns {@link SelfManagedCalculateCartResponse}.
 *
 * Use {@link isTaxCloudCartResponse} to narrow.
 */
export type AnyCalculateCartResponse = CalculateCartResponse | SelfManagedCalculateCartResponse;

/**
 * Narrow a cart calculation result to the TaxCloud-connected shape.
 *
 * @param response - Result returned by calculateCart
 * @returns true when the response came from a TaxCloud-connected merchant
 */
export function isTaxCloudCartResponse(
  response: AnyCalculateCartResponse
): response is CalculateCartResponse {
  return typeof (response as CalculateCartResponse).connectionId === 'string';
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/**
 * The kind of order: a sale or a credit
 */
export type OrderKind = 'order' | 'credit';

/**
 * A line item on an order, including the tax that was collected
 */
export interface OrderLineItem extends CartLineItem {
  /** The tax rate and amount collected for this line item */
  tax: Tax;
}

/**
 * Request to record an order directly
 *
 * @experimental
 */
export interface CreateOrderRequest {
  /** UUID of the merchant to record the order for */
  merchantId: string;
  /** Your identifier for the order (max 50 characters) */
  orderId: string;
  /** Your identifier for the customer (max 50 characters) */
  customerId: string;
  /** RFC3339 datetime the order was purchased on */
  transactionDate: string;
  /** RFC3339 datetime the order shipped on, creating the tax liability */
  completedDate: string;
  /** The ship-from address of the sale */
  origin: TaxCloudAddress;
  /** The ship-to address of the sale */
  destination: TaxCloudAddress;
  /** The currency the prices and tax amounts are denominated in */
  currency: Currency;
  /** The items on the order, each including the tax collected */
  lineItems: OrderLineItem[];
  /** The kind of order (default: 'order') */
  kind?: OrderKind;
  /**
   * The sales channel the order came from. Pass amazon, ebay, or walmart to
   * exclude marketplace-facilitated orders from filing.
   */
  channel?: string | null;
  /** Whether the seller delivers directly rather than via common carrier */
  deliveredBySeller?: boolean;
  /** Whether to exclude the order from tax filing */
  excludeFromFiling?: boolean;
  /** Optional exemption information for the customer */
  exemption?: Exemption;
  /** Optional line-item and order-level discounts */
  discounts?: Discounts;
  /** Optional batch ID for grouping related orders */
  batchId?: string;
}

/**
 * Request to record an order from a previously calculated cart
 *
 * @experimental
 */
export interface CreateOrderFromCartRequest {
  /** UUID of the merchant to record the order for */
  merchantId: string;
  /** The cartId from a previous calculateCart call (max 50 characters) */
  cartId: string;
  /** Your identifier for the resulting order (max 50 characters) */
  orderId: string;
  /** Whether the order has shipped. Ignored when completedDate is set */
  completed?: boolean;
  /** RFC3339 datetime the order shipped on. Takes precedence over `completed` */
  completedDate?: string;
  /** The kind of order to create (default: 'order') */
  kind?: OrderKind;
}

/**
 * Request to retrieve an order
 *
 * @experimental
 */
export interface GetOrderRequest {
  /** UUID of the merchant that owns the order */
  merchantId: string;
  /** Your identifier for the order, as supplied when it was created */
  orderId: string;
  /** Set to 'refunds' to include the order's refunds in the response */
  expand?: 'refunds';
}

/**
 * Request to update an order
 *
 * @experimental
 */
export interface UpdateOrderRequest {
  /** UUID of the merchant that owns the order */
  merchantId: string;
  /** Your identifier for the order, as supplied when it was created */
  orderId: string;
  /** RFC3339 datetime the order shipped on, creating the tax liability */
  completedDate?: string;
}

/**
 * An order as returned by create, get, and update
 *
 * @experimental
 */
export interface OrderResponse {
  /** The TaxCloud connection the order was recorded under */
  connectionId: string;
  /** Your identifier for the order */
  orderId: string;
  /** The kind of order */
  kind: OrderKind;
  /** Your identifier for the customer */
  customerId: string;
  /** RFC3339 datetime the order was purchased on */
  transactionDate?: string;
  /** RFC3339 datetime the order shipped on. Absent until the order completes */
  completedDate?: string;
  /** The ship-from address of the order */
  origin: TaxCloudAddressResponse;
  /** The ship-to address of the order */
  destination: TaxCloudAddressResponse;
  /** The currency the prices and tax amounts are denominated in */
  currency: CurrencyResponse;
  /** The order's line items, each with its tax rate and amount */
  lineItems: CartLineItemResponse[] | null;
  /** Whether the seller delivered the order directly */
  deliveredBySeller: boolean;
  /** The exemption information recorded on the order */
  exemption: Exemption;
  /** The sales channel the order came from; null when none was supplied */
  channel: string | null;
  /** Whether the order is excluded from tax filing */
  excludeFromFiling: boolean;
  /** Batch ID grouping this order with related orders */
  batchId?: string;
  /** Refunds recorded against this order; only when `expand` was 'refunds' */
  refunds?: RefundResponse[] | null;
}

// ---------------------------------------------------------------------------
// Refunds
// ---------------------------------------------------------------------------

/**
 * A line item and quantity to refund
 */
export interface RefundItem {
  /** The itemId of the line item to refund; must match the original order */
  itemId: string;
  /** The quantity to refund; may be fractional, up to the ordered quantity */
  quantity: number;
}

/**
 * Request to refund all or part of a recorded order.
 *
 * Omit `items` (or send an empty array) to refund the entire order.
 *
 * @experimental
 */
export interface CreateRefundRequest {
  /** UUID of the merchant that owns the order */
  merchantId: string;
  /** Your identifier for the order to refund */
  orderId: string;
  /** The line items and quantities to refund. Omit for a full refund */
  items?: RefundItem[] | null;
  /**
   * Include only if this return amends a previously filed sales tax return.
   * RFC3339 datetime.
   */
  returnedDate?: string;
  /** Optional batch ID for grouping related refunds */
  batchId?: string;
}

/**
 * A refunded line item
 */
export interface RefundItemResponse {
  /** Zero-based position of the item within the refund */
  index: number;
  /** The itemId of the refunded line item */
  itemId: string;
  /** The unit price refunded, calculated automatically from the order */
  price: number;
  /** The quantity refunded */
  quantity: number;
  /** Taxability Information Code of the refunded item */
  tic?: number;
  /** The tax amount refunded for this line item */
  tax?: RefundTax;
}

/**
 * A refund as returned by createRefund
 *
 * @experimental
 */
export interface RefundResponse {
  /** The TaxCloud connection the refund was recorded under */
  connectionId: string;
  /** The refunded line items */
  items: RefundItemResponse[] | null;
  /** RFC3339 datetime the refund was created */
  createdDate?: string;
  /** RFC3339 datetime the refund took effect */
  returnedDate?: string;
  /** Batch ID grouping this refund with related refunds */
  batchId?: string;
}

// ---------------------------------------------------------------------------
// Exemption Certificates
// ---------------------------------------------------------------------------

/**
 * The type of business an exempt customer is
 */
export type CustomerBusinessType =
  | 'AccommodationAndFoodServices'
  | 'AgriculturalForestryFishingHunting'
  | 'Construction'
  | 'FinanceAndInsurance'
  | 'InformationPublishingAndCommunications'
  | 'Manufacturing'
  | 'Mining'
  | 'RealEstate'
  | 'RentalAndLeasing'
  | 'RetailTrade'
  | 'TransportationAndWarehousing'
  | 'Utilities'
  | 'WholesaleTrade'
  | 'BusinessServices'
  | 'ProfessionalServices'
  | 'EducationAndHealthCareServices'
  | 'NonprofitOrganization'
  | 'Government'
  | 'NotABusiness'
  | 'Other';

/**
 * The reason a customer is exempt from sales tax
 */
export type ExemptionReason =
  | 'FederalGovernment'
  | 'StateOrLocalGovernment'
  | 'TribalGovernment'
  | 'ForeignDiplomat'
  | 'CharitableOrganization'
  | 'EducationalOrganization'
  | 'Resale'
  | 'AgriculturalProduction'
  | 'IndustrialProductionOrManufacturing'
  | 'DirectPayPermit'
  | 'DirectMail'
  | 'Other'
  | 'ReligiousOrganization';

/**
 * A state an exemption certificate is valid in
 */
export interface ExemptState {
  /** Two-letter state abbreviation */
  abbreviation: string;
}

/**
 * Request to create an exemption certificate
 *
 * @experimental
 */
export interface CreateCertificateRequest {
  /** UUID of the merchant to store the certificate for */
  merchantId: string;
  /**
   * Your identifier for the exempt customer. Carts and orders submitted with
   * this customerId are matched against the certificate.
   */
  customerId: string;
  /** Name of the customer or organization the certificate is issued to */
  customerName: string;
  /** The type of business the customer is */
  customerBusinessType: CustomerBusinessType;
  /** Free-text business description. Provide when type is 'Other' */
  customerBusinessDescription?: string;
  /** The reason the customer is exempt from sales tax */
  reason: ExemptionReason;
  /** Short elaboration of the exemption reason (max 20 characters) */
  reasonDescription: string;
  /** Address of the exempt customer */
  address: TaxCloudAddress;
  /** The states the certificate is valid in */
  states: ExemptState[];
}

/**
 * Request to retrieve an exemption certificate
 *
 * @experimental
 */
export interface GetCertificateRequest {
  /** UUID of the merchant that owns the certificate */
  merchantId: string;
  /** The certificateId returned when the certificate was created */
  certificateId: string;
}

/**
 * Request to delete (revoke) an exemption certificate
 *
 * @experimental
 */
export interface DeleteCertificateRequest {
  /** UUID of the merchant that owns the certificate */
  merchantId: string;
  /** The certificateId returned when the certificate was created */
  certificateId: string;
}

/**
 * Request to list exemption certificates
 *
 * @experimental
 */
export interface ListCertificatesRequest {
  /** UUID of the merchant whose certificates to list */
  merchantId: string;
  /** Filter to certificates belonging to this customerId */
  customerId?: string;
  /** Maximum certificates per page (default 20, maximum 100) */
  limit?: number;
  /** Opaque cursor from `nextCursor` of a previous response */
  cursor?: string;
  /** Field to sort by (default: 'id') */
  sortBy?: 'createdDate' | 'id';
  /** Sort ascending (default: false, i.e. descending) */
  ascending?: boolean;
  /** List disabled (revoked) certificates instead of active ones */
  disabled?: boolean;
}

/**
 * An exemption certificate
 *
 * @experimental
 */
export interface CertificateResponse {
  /** TaxCloud's identifier for the certificate */
  certificateId: string;
  /** The TaxCloud connection the certificate belongs to */
  connectionId: string;
  /** The TaxCloud account id the certificate belongs to */
  accountId: number;
  /** Your identifier for the exempt customer */
  customerId: string;
  /** Name of the customer the certificate was issued to */
  customerName: string;
  /** The type of business the customer is */
  customerBusinessType: string;
  /** Free-text business description, when type is 'Other' */
  customerBusinessDescription?: string;
  /** The reason the customer is exempt */
  reason: string;
  /** Free-text elaboration of the exemption reason */
  reasonDescription: string;
  /** Address of the exempt customer */
  address: TaxCloudAddressResponse;
  /** The states the certificate is valid in */
  states: ExemptState[] | null;
  /** Whether the certificate covers a single purchase rather than being blanket */
  singlePurchase: boolean;
  /** RFC3339 datetime the certificate was created */
  createdDate: string;
  /** RFC3339 datetime the certificate was disabled, or null while active */
  disabledAt?: string | null;
}

/**
 * A page of exemption certificates
 *
 * @experimental
 */
export interface ListCertificatesResponse {
  /** The certificates on this page of results */
  items: CertificateResponse[] | null;
  /** The maximum number of results per page that was applied */
  limit: number;
  /** Cursor to pass as `cursor` on the next call; null when no more results */
  nextCursor: string | null;
}
