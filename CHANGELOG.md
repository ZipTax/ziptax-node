# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
