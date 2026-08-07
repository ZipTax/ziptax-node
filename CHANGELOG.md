# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-beta] - 2026-08-07

Realigns the SDK with the current Ziptax API. TaxCloud access has moved from a
direct connection to Ziptax-proxied merchant endpoints, which makes this a
breaking release. See **Migrating from 0.2.x** in the README.

### Added

Merchant Management (`@experimental`, Private Preview):
- `createMerchant()`, `updateMerchant()`, `getMerchant()`, `listMerchants()`, `deleteMerchant()`
- `setMerchantCredentials()`, `deleteMerchantCredentials()` - store or remove a merchant's TaxCloud credentials server-side
- `MerchantType`, `MerchantStatus`, `Merchant`, `MerchantUpdate`, and request/response types

Exemption certificates (`@experimental`):
- `createExemptionCertificate()`, `getExemptionCertificate()`, `listExemptionCertificates()`, `deleteExemptionCertificate()`
- `CustomerBusinessType`, `ExemptionReason`, `ExemptState`, `CertificateResponse`, `ListCertificatesResponse` types
- Cursor pagination on list via `cursor` / `nextCursor`

Event Webhooks:
- `verifyWebhookSignature()` - timing-safe HMAC-SHA256 verification of the `X-Signature` header
- `computeWebhookSignature()`, `parseWebhookEvent()`, `parseWebhookTimestamp()` helpers
- `WebhookEvent`, `RateUpdatedEvent`, `RateUpdateDetail`, `WebhookLocality` types
- Endpoints and subscriptions are configured in the dashboard under Develop > Events; there is no API for them

Data and system endpoints:
- `getTicData()` - full TIC list with category hierarchy (`GET /data/tic`)
- `getTicSearchSchema()` - JSON Schema for the TIC search response
- `getHealth()`, `getSystemMetadata()` - `GET /system/health` and `GET /system/metadata`
- `getAccountUsage()` - `GET /account/metrics`, with core, geo, and **merchant** quotas broken out separately

Rate lookups:
- `city`, `state`, `stateCode`, and `county` on `getSalesTaxByAddress()` to disambiguate a location
- `state` on `getRatesByPostalCode()` to narrow overlapping jurisdictions
- `adjustment`, `addressDetailExtended`, `shippingExtended`, and `satItemTotal` parameters
- `V60ProductDetail`, `V60TaxabilityCode`, and `V60RateRule` types for the `productDetail` object returned when `taxabilityCode` is supplied
- `V60AddressComponents` for the geocoding breakdown returned by `addressDetailExtended`
- `V60ShippingExtended` for the detailed shipping object returned by `shippingExtended`
- `countryCode` now accepts the US territories `PRI`, `ASM`, `GUM`, `MNP`, and `VIR` alongside `USA` and `CAN`

Other:
- `environment` client option and a per-call `RequestOptions` override, sending `X-ENV: LIVE | TEST` on Merchant Transactions calls
- Cart and order support for `discounts` (line-item and order-level), `exemption`, `deliveredBySeller`, `batchId`, `channel`, `excludeFromFiling`, and credit orders via `kind`
- `isTaxCloudCartResponse()` type guard to narrow a cart result by merchant compliance model
- `validateUuid()`, `validateNumberRange()`, and `validateHistorical()` validation helpers
- Examples: `merchant-management.ts`, `merchant-transactions.ts`, `webhooks.ts`

### Changed

**Breaking.** Cart, order, and refund calls now go through the Ziptax API rather
than `api.v3.taxcloud.com`:
- Removed the `taxCloudConnectionId` and `taxCloudAPIKey` client options. Store a merchant's credentials once with `setMerchantCredentials()`; Ziptax resolves them server-side on every call
- Every cart, order, certificate, and refund request now takes a `merchantId` (UUID)
- `calculateCart()` targets `POST /merchant/cart/calculate`. Addresses are structured (`line1`, `city`, `state`, `zip`) instead of a single `address` string; line items require a unique `index` and use `tic` instead of `taxabilityCode`; `items` accepts 1-100 carts instead of exactly 1
- `calculateCart()` returns `AnyCalculateCartResponse`; a self-managed merchant returns the stateless `SelfManagedCalculateCartResponse` shape with no `connectionId` and no convertible cart
- `getOrder(request)` and `updateOrder(request)` take a single request object and are `POST` calls (`/merchant/order/get`, `/merchant/order/update`) rather than `GET` and `PATCH`
- `refundOrder(request)` takes a single request object, targets `POST /merchant/refund/create`, and returns one `RefundResponse` instead of `RefundTransactionResponse[]`
- `getSalesTaxByGeoLocation()` takes `lat` and `lng` as numbers rather than strings, validated to ±90 and ±180
- HTTP 403 now raises `ZiptaxAPIError` instead of `ZiptaxAuthenticationError`. On the merchant endpoints 403 means the merchant is unknown, not owned by the account, or the operation is unavailable for a self-managed merchant, none of which are credential problems
- `V60Response.baseRates`, `taxSummaries`, and `sourcingRules` are required and nullable rather than optional, matching the API
- Renamed `src/models/taxcloud.ts` to `src/models/transactions.ts`
- Cart and order type names dropped their `TaxCloud`/`CartItem` prefixes: `CartItem` is now `Cart`, `CartItemWithTax` is now `OrderLineItem`, `RefundTransactionRequest` is now `CreateRefundRequest`, `RefundTransactionResponse` is now `RefundResponse`
- Line-item `price` and `quantity` now accept `0`, matching the API's documented minimum of 0
- `validateProductQuery()` allows 1024 characters, up from 500, matching the API limit

### Fixed
- `ProductCodeSearchResult.ticId`, `.rank`, and `.score` are typed `number`; they were `string` but the API returns numbers
- `ProductCodeRecommendation.ticId` is typed `number` for the same reason
- Rate lookups request `/request/v60` without a trailing slash. `/request/v60/` returns a 301, so every call was paying an extra redirect
- `taxabilityCode` validation accepts alphanumeric override codes such as `CIR00001`; it previously rejected anything non-numeric
- `V60Service.taxable` includes `'L'` (taxability varies by locality)
- API error messages now surface `detail` and `title`, so operation-level 422 responses no longer collapse to a generic status message
- `ProductCodeSearchResponse` exposes `nextCursor` and `$schema`

### Removed
- `parseAddressString()` and the `ParsedAddress` type. The cart endpoints take structured addresses directly, so no parsing step is needed
- Legacy `POST /calculate/cart` routing. That endpoint is absent from the API reference; use `calculateCart()` with a `merchantId`
- `examples/taxcloud-orders.ts`, replaced by `examples/merchant-transactions.ts`

### Notes
- Merchant Management is a Private Preview feature and Merchant Transactions is in active development. Both are annotated `@experimental`; their contracts may change before general availability. Contact support@zip.tax for access
- Nexus Management and Economic Thresholds are managed in the platform UI and have no API surface, so the SDK does not cover them
- `POST /merchant/credentials/get` is intentionally not exposed; it is absent from the public API reference

## [0.2.3-beta] - 2026-04-17

### Added
- `searchProductCodes()` - Search for product codes (TICs) by natural language description, returning all matching Taxability Information Codes ranked and scored by relevance
- `recommendProductCode()` - Get an AI-powered product code (TIC) recommendation with higher accuracy than the standard search
- `ProductCodeSearchRequest`, `ProductCodeSearchResult`, `ProductCodeSearchResponse` types for TIC search
- `ProductCodeRecommendation`, `ProductCodeRecommendationResponse` types for TIC recommendation
- `validateProductQuery()` validation helper for product query inputs (non-empty, max 500 characters)

## [0.2.2-beta] - 2026-03-11

### Added
- `createOrderFromCart()` - Create a TaxCloud order from a previously calculated cart, converting an existing cart (via `calculateCart` with TaxCloud credentials) into a finalized order for tax filing
- `CreateOrderFromCartRequest` type with `cartId` and `orderId` fields
- `calculateCart()` - Calculate sales tax for a shopping cart with dual routing:
  - Routes to TaxCloud API when TaxCloud credentials are configured
  - Routes to ZipTax API when only ZipTax credentials are configured
- Address parsing utility (`parseAddressString`) for transforming single-string addresses into structured TaxCloud format
- Cart request validation (items count, line item limits, currency, addresses, price/quantity)
- `TaxCloudCalculateCartResponse`, `TaxCloudCartItemResponse`, and `TaxCloudCartLineItemResponse` types for TaxCloud cart calculation responses
- `CalculateCartRequest`, `CalculateCartResponse`, and related cart types for ZipTax cart calculation

### Fixed
- Price and quantity validation now rejects `NaN` and `Infinity` values in cart line items

## [0.2.0-beta] - 2026-02-16

### Added
- TaxCloud API integration for order management (optional)
  - `createOrder()` - Create orders from marketplace transactions, pre-existing systems, or bulk uploads
  - `getOrder()` - Retrieve a specific order by ID from TaxCloud
  - `updateOrder()` - Update an existing order's completedDate in TaxCloud
  - `refundOrder()` - Create partial or full refunds against an order in TaxCloud
- `getRatesByPostalCode()` - Get sales and use tax rates by 5-digit US postal code
- New configuration options: `taxCloudConnectionId` and `taxCloudAPIKey` for TaxCloud credentials
- Comprehensive TypeScript types for all TaxCloud API models (addresses, orders, refunds, currency, exemptions)
- Full type exports for all public types including TaxCloud models and postal code types
- `ZiptaxConfigurationError` thrown when TaxCloud methods are called without credentials
- API response-body error checking for invalid API keys (HTTP 200 with error code 101)
- TaxCloud example script (`examples/taxcloud-orders.ts`)
- GitHub Actions workflow for semantic version enforcement on PRs (`version-check.yml`)
- CONTRIBUTING.md with contribution guidelines and versioning requirements
- CLAUDE.md project context file for AI assistants

### Changed
- Client initialization now supports optional TaxCloud credentials alongside ZipTax API key
- Enhanced HTTP client with PATCH method support for TaxCloud order updates
- Dynamic User-Agent header now uses package version (`ziptax-node/0.2.0-beta`) instead of hardcoded value
- `V60AccountMetrics` type corrected to use `request_count`, `request_limit`, `usage_percent`, `is_active`, `message` fields (matching actual API response)
- Historical date parameter format corrected to `YYYYMM` (e.g., `202401`) across all endpoints and documentation
- `refundOrder()` request parameter is now optional - omitting items creates a full refund per TaxCloud API spec
- `RefundTransactionRequest.items` made optional to support full refunds
- `RefundTransactionResponse.returnedDate` made optional to match API behavior

### Fixed
- Invalid API key now correctly throws `ZiptaxAuthenticationError` instead of returning error in response body
- `verifyTaxCloudCredentials()` now throws `ZiptaxConfigurationError` instead of generic `Error`
- Historical date validation regex corrected from `/^[0-9]{4}-[0-9]{2}$/` to `/^[0-9]{6}$/`
- Removed unused `TaxCloudHTTPClientConfig` interface from HTTP client
- Fixed Prettier formatting across all source files

## [0.1.4-beta] - 2024-01-15

### Added
- Initial beta release of ZipTax Node.js SDK
- Support for `getSalesTaxByAddress()` API endpoint
- Support for `getSalesTaxByGeoLocation()` API endpoint
- Support for `getAccountMetrics()` API endpoint
- Full TypeScript support with comprehensive type definitions
- Automatic retry logic with exponential backoff
- Request/response logging
- Comprehensive error handling with custom error types:
  - `ZiptaxError` (base), `ZiptaxAPIError`, `ZiptaxAuthenticationError`
  - `ZiptaxRateLimitError`, `ZiptaxValidationError`, `ZiptaxNetworkError`, `ZiptaxRetryError`
- Support for both CommonJS and ES Modules
- 80%+ test coverage
- Complete documentation and examples

### Features
- Promise-based async/await API
- Configurable retry options with exponential backoff
- Input validation for all parameters
- Rate limit handling with retry-after support
- Network error handling
- Authentication error handling
