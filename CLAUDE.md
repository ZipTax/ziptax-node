# CLAUDE.md - ZipTax Node.js SDK

This document provides context and guidance for AI assistants (like Claude) working on the ZipTax Node.js SDK project.

## Project Overview

The ZipTax Node.js SDK is an official TypeScript/JavaScript client library for the
Ziptax API, covering:
1. **Rate lookups** - Sales and use tax rates for US and Canadian addresses, coordinates, and postal codes
2. **Product taxability** - TIC catalog, search, and AI recommendation
3. **Merchant compliance** - Merchant management, cart tax, orders, exemption certificates, and refunds (Private Preview / in active development)
4. **Webhooks** - Signature verification and typed event payloads for deliveries

**Repository:** https://github.com/ziptax/ziptax-node
**Package:** `@ziptax/node-sdk` on npm
**License:** MIT

## Architecture

### Core Structure

```
src/
├── client.ts           # Main ZiptaxClient class
├── config.ts          # Configuration types and interfaces
├── exceptions.ts      # Custom error classes
├── models/
│   ├── index.ts        # Model exports
│   ├── responses.ts    # Rate, account, system, and TIC types
│   ├── merchant.ts     # Merchant management types
│   ├── transactions.ts # Cart, order, certificate, refund types
│   └── webhooks.ts     # Webhook event payload types
└── utils/
    ├── http.ts        # HTTPClient with retry logic
    ├── retry.ts       # Retry configuration
    ├── validation.ts  # Input validation helpers
    └── webhooks.ts    # Webhook signature verification
```

### Key Design Decisions

1. **Single Host**: Every call goes to the Ziptax API. Merchant TaxCloud credentials are stored server-side via `/merchant/credentials/set`, so the SDK never talks to `api.v3.taxcloud.com`
2. **TypeScript First**: Full type safety with comprehensive interfaces for all API responses
3. **Merchant-Scoped Transactions**: Cart, order, certificate, and refund calls take a `merchantId`; the response shape depends on the merchant's compliance model
4. **Retry Logic**: Built-in exponential backoff for transient failures
5. **Naming Convention**: camelCase for all fields, except where the API returns snake_case (account metrics, TIC data, system metadata, `merchant_type`)
6. **Documented Surface Only**: An endpoint is exposed only if it appears in the docs.zip.tax API Reference. See docs/api-coverage.md

### Client Initialization Patterns

```typescript
// One API key covers everything
const client = new ZiptaxClient({ apiKey: 'xxx' });

// Target a merchant's Test (sandbox) environment instead of Live
const client = new ZiptaxClient({ apiKey: 'xxx', environment: 'TEST' });
```

## API Endpoints

**See [docs/api-coverage.md](docs/api-coverage.md)** for the full endpoint-to-method
map, the endpoints deliberately left unexposed and why, and how to add a new one.

Summary:

| Group | Methods |
|-------|---------|
| Rate lookups | `getSalesTaxByAddress()`, `getSalesTaxByGeoLocation()`, `getRatesByPostalCode()` |
| Account | `getAccountMetrics()`, `getAccountUsage()` |
| Product codes | `searchProductCodes()`, `recommendProductCode()`, `getTicData()`, `getTicSearchSchema()` |
| System | `getHealth()`, `getSystemMetadata()` |
| Merchants | `createMerchant()`, `updateMerchant()`, `getMerchant()`, `listMerchants()`, `deleteMerchant()`, `setMerchantCredentials()`, `deleteMerchantCredentials()` |
| Transactions | `calculateCart()`, `createOrder()`, `createOrderFromCart()`, `getOrder()`, `updateOrder()`, `refundOrder()` |
| Certificates | `createExemptionCertificate()`, `getExemptionCertificate()`, `listExemptionCertificates()`, `deleteExemptionCertificate()` |
| Webhooks (helpers) | `verifyWebhookSignature()`, `parseWebhookEvent()`, `parseWebhookTimestamp()` |

Rate lookups all hit `GET /request/v60` — **no trailing slash**. `/request/v60/`
returns a 301, costing an extra round trip on every call.

## Type System

### Important Type Conventions

1. **Most Responses**: camelCase (e.g., `baseRates`, `taxSummaries`)
2. **snake_case exceptions**: account metrics (`request_count`, `core_usage_percent`), TIC data (`nl_title`), system metadata (`go_version`), and the `merchant_type` request field. These match the API; do not "fix" them
3. **Nullable arrays**: The API returns `array | null` for many collections (`baseRates`, `lineItems`, `results`). Model these as required-but-nullable, not optional
4. **Jurisdiction Names**: Use actual values like "CA", "ORANGE" (not enums)
5. **Experimental**: Annotate Private Preview and in-development surface `@experimental` in JSDoc

### Key Response Types

- `V60Response` - Standard tax lookup response
- `V60PostalCodeResponse` - Postal-code-only lookup (different format)
- `V60ProductDetail` - Product rules, present when `taxabilityCode` is supplied
- `V60AccountMetrics` / `AccountUsageMetrics` - Account metrics (snake_case)
- `AnyCalculateCartResponse` - Union; narrow with `isTaxCloudCartResponse()`
- `OrderResponse`, `RefundResponse`, `CertificateResponse`
- `Merchant` - Merchant record; `status` reveals the compliance model
- `RateUpdatedEvent` - Webhook payload

## Development Workflow

### Build & Test Commands

```bash
npm run build          # Build all formats (CJS, ESM, types)
npm test              # Run Jest tests
npm run test:coverage # Generate coverage report (requires 80%+)
npm run lint          # ESLint check
npm run format        # Prettier format
npm run type-check    # TypeScript validation
```

### Semantic Versioning Enforcement

**All PRs to `main` require a version bump in `package.json`.**

The `version-check` GitHub Action automatically validates:
- ✅ Version has been bumped from base branch
- ✅ New version follows semantic versioning
- ⚠️ CHANGELOG.md has been updated (warning if not)

**Before creating a PR:**

```bash
# Breaking changes (0.2.0-beta → 1.0.0)
npm version major

# New features, backward compatible (0.2.0-beta → 0.3.0-beta)
npm version minor

# Bug fixes, backward compatible (0.2.0-beta → 0.2.1-beta)
npm version patch

# Prerelease versions (0.2.0 → 0.2.1-beta.0)
npm version prerelease --preid=beta

# Then update CHANGELOG.md and commit
git add CHANGELOG.md package.json package-lock.json
git commit -m "chore: bump version to x.y.z"
```

**Skip version check** (docs/CI changes only):
- Add `skip-version-check` label to PR
- Use sparingly, only for non-code changes

### Code Quality Requirements

- **Test Coverage**: Minimum 80% required
- **TypeScript**: Strict mode enabled, no `any` types
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier with 100-char line length

### Example Scripts

```bash
npm run example:basic     # Basic ZipTax usage
npm run example:async     # Concurrent requests
npm run example:errors    # Error handling
npm run example:merchants # Merchant management
npm run example:merchant  # Merchant transactions (cart -> order -> refund)
npm run example:webhooks  # Webhook signature verification
```

## Common Tasks

### Adding a New API Endpoint

1. Confirm the endpoint appears in the docs.zip.tax API Reference; if not, it stays unexposed (see docs/api-coverage.md)
2. Add types to the right file under `src/models/` (`responses.ts`, `merchant.ts`, `transactions.ts`, `webhooks.ts`)
3. Add method to `src/client.ts` with JSDoc comments, plus `@experimental` if it is Private Preview or in active development
4. Export types from `src/index.ts` (the models barrel re-exports automatically)
5. Add tests to the matching suite (`client.test.ts`, `merchant.test.ts`, `transactions.test.ts`, `webhooks.test.ts`)
6. Update README.md with usage examples
7. Update docs/api-coverage.md
8. Update CHANGELOG.md

### Updating Dependencies

```bash
npm update              # Update dependencies
npm audit fix          # Fix security issues
npm run test           # Verify tests pass
```

### Publishing New Version

**Automated via GitHub Actions:**

1. Ensure version is bumped and CHANGELOG.md is updated
2. Merge PR to `main` (after passing all checks)
3. Create a GitHub Release with version tag (e.g., `v0.2.0-beta`)
4. Publish workflow automatically runs and publishes to npm
5. Prerelease versions (e.g., `-beta`) are published under the `beta` dist-tag, not `latest`

**Manual publishing (if needed):**

1. Update version: `npm version [major|minor|patch|prerelease --preid=beta]`
2. Move changes to new version section in `CHANGELOG.md`
3. Run `npm run prepublishOnly` (builds, tests, lints)
4. Create git tag: `git tag v0.x.x-beta`
5. Push with tags: `git push origin main --tags`
6. Publish: `npm publish --access public` (or `npm publish --access public --tag beta` for prereleases)

## Testing Strategy

### Test Structure

```
tests/
├── client.test.ts        # Rate lookups, account, product codes, system
├── merchant.test.ts      # Merchant CRUD + credentials
├── transactions.test.ts  # Cart, orders, refunds, exemption certificates
├── webhooks.test.ts      # Signature verification and event parsing
├── http.test.ts          # HTTPClient tests (requests, error handling, response body checks)
├── validation.test.ts    # Input validation utility tests
├── exceptions.test.ts    # Custom error class tests
├── retry.test.ts         # Retry logic tests (backoff, max attempts)
└── setup.ts              # Test configuration
```

### Mocking Strategy

- Mock axios responses for HTTP tests
- Use fixtures for realistic API response data
- Test both success and error paths
- Verify retry logic with transient failures

### Running Specific Tests

```bash
npm test -- client.test.ts              # Single file
npm test -- --testNamePattern="create"  # Match test name
npm run test:coverage                   # With coverage
```

## Error Handling

### HTTP Status Mapping

| Status | Error type |
|--------|-----------|
| 401 | `ZiptaxAuthenticationError` |
| 403 | `ZiptaxAPIError` — on merchant routes this means unknown merchant or unavailable operation, not a credential problem |
| 429 | `ZiptaxRateLimitError` |
| other 4xx/5xx | `ZiptaxAPIError` (message from `message`, then `detail`, then `title`) |
| no response | `ZiptaxNetworkError` |

### Error Hierarchy

```
ZiptaxError (base)
├── ZiptaxAPIError (API errors)
│   ├── ZiptaxAuthenticationError (401)
│   └── ZiptaxRateLimitError (429)
├── ZiptaxValidationError (input validation)
├── ZiptaxNetworkError (network failures)
├── ZiptaxRetryError (max retries exceeded)
└── ZiptaxConfigurationError (invalid config)
```

## Important Files

- **docs/api-coverage.md** - Endpoint-to-method map and exposure decisions
- **docs/openapi.json** - Snapshot of the live API spec (refresh from api.zip-tax.com/openapi.json)
- **README.md** - User documentation
- **CHANGELOG.md** - Version history (must update with each PR)
- **package.json** - Dependencies and scripts (version must be bumped in PRs)
- **tsconfig.json** - TypeScript configuration (strict mode)
- **.eslintrc.json** - ESLint rules
- **.prettierrc** - Prettier configuration
- **.github/workflows/** - CI/CD workflows (test, version-check, publish)

## API Documentation References

- Ziptax API: https://docs.zip.tax (append `.md` to any page for clean Markdown; section index at /v-6-0/llms.txt)
- Merchant Transactions: https://docs.zip.tax/guides/merchant-compliance-solutions/transactions
- Event Webhooks: https://docs.zip.tax/guides/webhooks/overview
- OpenAPI Spec: https://api.zip-tax.com/openapi.json
- API source: https://github.com/ZipTax/ziptax-api

## Debugging Tips

### Enable Logging

```typescript
const client = new ZiptaxClient({
  apiKey: 'xxx',
  enableLogging: true  // Logs all requests/responses
});
```

### Common Issues

1. **Merchant not configured**: Store the merchant's TaxCloud credentials with `setMerchantCredentials()`; a merchant without them returns 404 on every transaction call
2. **Type errors**: Ensure types match API responses (check docs/openapi.json, then the docs page — the docs win where they disagree)
3. **Rate limiting**: SDK includes automatic retry with backoff
4. **Validation errors**: Check required fields and formats (e.g., postal code is 5-digit, historical date is YYYYMM)
5. **Historical date format**: Must be `YYYYMM` (e.g., `202401`), not `YYYY-MM`
6. **Account metrics fields**: `getAccountMetrics()` returns `request_count`/`usage_percent`; `getAccountUsage()` returns the `core_`/`geo_`/`merchant_` prefixed breakdown. Both are current
7. **Merchant 403**: A self-managed merchant (`status: 'external_compliance'`) gets 403 on every transaction endpoint except `calculateCart()`
8. **Merchant 404**: Means no TaxCloud credentials on file — call `setMerchantCredentials()`
9. **Trailing slash**: Use `/request/v60`, not `/request/v60/` (301 redirect)

## Best Practices

### When Adding Features

1. Follow existing patterns in `src/client.ts`
2. Add comprehensive TypeScript types
3. Include JSDoc comments with examples
4. Write tests achieving 80%+ coverage
5. **Bump version** in `package.json` using `npm version [major|minor|patch]`
6. **Update CHANGELOG.md** under `[Unreleased]` section
7. Update all documentation (README, examples)
8. Validate against docs/openapi.json and docs.zip.tax

### Code Style

- Use TypeScript interfaces (not types) for public API
- Export all public types from `src/index.ts`
- Keep line length under 100 characters
- Use single quotes for strings
- Add trailing commas in multi-line objects
- Explicit return types on public methods

### Git Commit Messages

Follow conventional commits:
- `feat:` - New features (minor version bump)
- `fix:` - Bug fixes (patch version bump)
- `docs:` - Documentation changes (no version bump with label)
- `test:` - Test changes (patch version bump)
- `refactor:` - Code refactoring (patch/minor version bump)
- `chore:` - Build/tooling changes (no version bump with label)
- `BREAKING CHANGE:` - Breaking changes (major version bump)

Example: `feat: add exemption certificate management`

**Important**: Commit both version bump and changelog update:
```bash
npm version minor  # e.g., 0.2.0-beta → 0.3.0-beta (bumps version and creates commit)
git add CHANGELOG.md
git commit --amend --no-edit  # Add CHANGELOG to version commit
```

## Notable Implementation Details

### HTTP Client

- One instance, pointed at the Ziptax API. Merchant transactions are proxied server-side
- Automatic retry with exponential backoff
- Custom error handling based on HTTP status codes
- Response-body error checking: API returns HTTP 200 with error codes (e.g., code 101 = invalid key throws `ZiptaxAuthenticationError`)
- Dynamic User-Agent header using `npm_package_version` environment variable
- Optional request/response logging via interceptors
- Supports GET, POST, and PATCH methods

### Validation

- Runtime validation for required fields
- Format validation (e.g., postal codes, UUIDs)
- Helpful error messages with field names

### Build Output

Three formats generated:
1. **CommonJS** (`dist/cjs/`) - For Node.js require()
2. **ES Modules** (`dist/esm/`) - For modern import
3. **Type Definitions** (`dist/types/`) - For TypeScript

## Getting Help

- **Issues**: https://github.com/ziptax/ziptax-node/issues
- **Email**: support@zip.tax
- **Documentation**: https://docs.zip.tax

## Version History

- **v0.1.4-beta** - Initial beta release with ZipTax API support
- **v0.2.0-beta** - Added TaxCloud integration and postal code lookups
- **v0.2.2-beta** - Cart tax calculation and create-order-from-cart
- **v0.2.3-beta** - TIC search and AI recommendation
- **v1.0.0-beta** - Realigned with the current API: TaxCloud access moved to Ziptax-proxied `/merchant/*` endpoints (breaking), plus merchant management, exemption certificates, webhooks, and the data/system endpoints

---

**Last Updated**: 2026-08-07
**Maintained By**: ZipTax Team
