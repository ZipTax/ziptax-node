# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- TaxCloud API integration for order management (optional)
- Support for CreateOrder endpoint - create orders from marketplace transactions
- Support for GetOrder endpoint - retrieve specific orders by ID
- Support for UpdateOrder endpoint - update order completedDate
- Support for RefundOrder endpoint - create partial or full refunds
- Support for GetRatesByPostalCode endpoint - postal code tax rate lookups
- New configuration options: `taxCloudConnectionId` and `taxCloudAPIKey`
- Comprehensive TypeScript types for all TaxCloud API models
- TaxCloud examples and documentation

### Changed
- Client initialization now supports optional TaxCloud credentials
- Updated README with TaxCloud documentation and examples
- Enhanced HTTP client with PATCH method support for order updates

## [1.0.0] - 2024-01-15

### Added
- Initial release of ZipTax Node.js SDK
- Support for GetSalesTaxByAddress API endpoint
- Support for GetSalesTaxByGeoLocation API endpoint
- Support for GetAccountMetrics API endpoint
- Full TypeScript support with comprehensive type definitions
- Automatic retry logic with exponential backoff
- Request/response logging
- Comprehensive error handling with custom error types
- Support for both CommonJS and ES Modules
- 80%+ test coverage
- Complete documentation and examples

### Features
- Promise-based async/await API
- Configurable retry options
- Input validation
- Rate limit handling
- Network error handling
- Authentication error handling