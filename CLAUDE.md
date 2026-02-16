# CLAUDE.md - ZipTax Node.js SDK

This document provides context and guidance for AI assistants (like Claude) working on the ZipTax Node.js SDK project.

## Project Overview

The ZipTax Node.js SDK is an official TypeScript/JavaScript client library for interacting with:
1. **ZipTax API** - Sales and use tax rate lookups for US addresses
2. **TaxCloud API** - Order management and tax compliance (optional integration)

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
│   ├── index.ts       # Model exports
│   ├── responses.ts   # ZipTax API response types
│   └── taxcloud.ts    # TaxCloud API types
└── utils/
    ├── http.ts        # HTTPClient with retry logic
    ├── retry.ts       # Retry configuration
    └── validation.ts  # Input validation helpers
```

### Key Design Decisions

1. **Dual API Support**: Single client supports both ZipTax (required) and TaxCloud (optional) APIs
2. **TypeScript First**: Full type safety with comprehensive interfaces for all API responses
3. **Optional TaxCloud**: TaxCloud features only available when credentials provided during initialization
4. **Retry Logic**: Built-in exponential backoff for transient failures
5. **Naming Convention**: camelCase for all fields (matching API responses)

### Client Initialization Patterns

```typescript
// Basic - Tax rate lookups only
const client = new ZiptaxClient({ apiKey: 'xxx' });

// With TaxCloud - Adds order management
const client = new ZiptaxClient({
  apiKey: 'ziptax-key',
  taxCloudConnectionId: 'uuid',
  taxCloudAPIKey: 'taxcloud-key'
});
```

## API Endpoints

### ZipTax API (Required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `getSalesTaxByAddress()` | GET /request/v60/ | Tax rates by address |
| `getSalesTaxByGeoLocation()` | GET /request/v60/ | Tax rates by lat/lng |
| `getRatesByPostalCode()` | GET /request/v60/ | Tax rates by postal code |
| `getAccountMetrics()` | GET /account/v60/metrics | Account usage metrics |

### TaxCloud API (Optional)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `createOrder()` | POST /tax/connections/{id}/orders | Create order |
| `getOrder()` | GET /tax/connections/{id}/orders/{orderId} | Retrieve order |
| `updateOrder()` | PATCH /tax/connections/{id}/orders/{orderId} | Update order |
| `refundOrder()` | POST /tax/connections/{id}/orders/refunds/{orderId} | Refund order |

## Type System

### Important Type Conventions

1. **ZipTax Responses**: Use camelCase (e.g., `baseRates`, `taxSummaries`)
2. **Account Metrics**: Use snake_case (e.g., `core_request_count`)
3. **Optional Fields**: Many fields are optional despite API documentation
4. **Jurisdiction Names**: Use actual values like "CA", "ORANGE" (not enums)

### Key Response Types

- `V60Response` - Standard tax lookup response
- `V60PostalCodeResponse` - Postal code lookup (different format)
- `V60AccountMetrics` - Account metrics (uses snake_case)
- `OrderResponse` - TaxCloud order response
- `RefundTransactionResponse[]` - Array of refund transactions

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
# Breaking changes (1.0.0 → 2.0.0)
npm version major

# New features, backward compatible (1.0.0 → 1.1.0)
npm version minor

# Bug fixes, backward compatible (1.0.0 → 1.0.1)
npm version patch

# Prerelease versions (1.0.0 → 1.0.1-beta.0)
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
npm run example:taxcloud  # TaxCloud order management
```

## Common Tasks

### Adding a New API Endpoint

1. Add types to `src/models/responses.ts` or `src/models/taxcloud.ts`
2. Add method to `src/client.ts` with JSDoc comments
3. Export types from `src/models/index.ts`
4. Add tests to `tests/client.test.ts`
5. Update README.md with usage examples
6. Update CHANGELOG.md

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
3. Create a GitHub Release with version tag (e.g., `v1.2.3`)
4. Publish workflow automatically runs and publishes to npm

**Manual publishing (if needed):**

1. Update version: `npm version [major|minor|patch]`
2. Move "[Unreleased]" changes to new version in `CHANGELOG.md`
3. Run `npm run prepublishOnly` (builds, tests, lints)
4. Create git tag: `git tag v1.x.x`
5. Push with tags: `git push origin main --tags`
6. Publish: `npm publish --access public`

## Testing Strategy

### Test Structure

```
tests/
├── client.test.ts     # Client method tests
├── http.test.ts       # HTTPClient tests
├── retry.test.ts      # Retry logic tests
└── setup.ts           # Test configuration
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

### Error Hierarchy

```
ZiptaxError (base)
├── ZiptaxAPIError (API errors)
│   ├── ZiptaxAuthenticationError (401)
│   ├── ZiptaxValidationError (400)
│   └── ZiptaxRateLimitError (429)
└── ZiptaxNetworkError (network failures)
```

### TaxCloud Credentials Error

When TaxCloud methods called without credentials:
```
Error: TaxCloud credentials not configured. Please provide...
```

## Important Files

- **docs/spec.yaml** - Complete API specification (source of truth)
- **README.md** - User documentation
- **CHANGELOG.md** - Version history (must update with each PR)
- **package.json** - Dependencies and scripts (version must be bumped in PRs)
- **tsconfig.json** - TypeScript configuration (strict mode)
- **.eslintrc.json** - ESLint rules
- **.prettierrc** - Prettier configuration
- **.github/workflows/** - CI/CD workflows (test, version-check, publish)

## API Documentation References

- ZipTax API: https://www.zip-tax.com/documentation
- TaxCloud Orders: https://docs.taxcloud.com/api-reference/api-reference/sales-tax-api/orders/
- OpenAPI Spec: https://api.zip-tax.com/openapi.json

## Debugging Tips

### Enable Logging

```typescript
const client = new ZiptaxClient({
  apiKey: 'xxx',
  enableLogging: true  // Logs all requests/responses
});
```

### Common Issues

1. **TaxCloud not configured**: Check both `taxCloudConnectionId` and `taxCloudAPIKey` are set
2. **Type errors**: Ensure types match API responses (check docs/spec.yaml)
3. **Rate limiting**: SDK includes automatic retry with backoff
4. **Validation errors**: Check required fields and formats (e.g., postal code is 5-digit)

## Best Practices

### When Adding Features

1. Follow existing patterns in `src/client.ts`
2. Add comprehensive TypeScript types
3. Include JSDoc comments with examples
4. Write tests achieving 80%+ coverage
5. **Bump version** in `package.json` using `npm version [major|minor|patch]`
6. **Update CHANGELOG.md** under `[Unreleased]` section
7. Update all documentation (README, examples)
8. Validate against docs/spec.yaml

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

Example: `feat: add support for TaxCloud order refunds`

**Important**: Commit both version bump and changelog update:
```bash
npm version minor  # Bumps version and creates commit
git add CHANGELOG.md
git commit --amend --no-edit  # Add CHANGELOG to version commit
```

## Notable Implementation Details

### HTTP Client

- Two instances: one for ZipTax, one for TaxCloud (if configured)
- Automatic retry with exponential backoff
- Custom error handling based on HTTP status codes
- Optional request/response logging

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
- **Documentation**: https://www.zip-tax.com/documentation

## Version History

- **v1.0.0** (2024-01-15) - Initial release with ZipTax API support
- **Unreleased** - Added TaxCloud integration and postal code lookups

---

**Last Updated**: 2026-02-16
**Maintained By**: ZipTax Team
