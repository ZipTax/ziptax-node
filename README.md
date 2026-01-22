# ZipTax Node.js SDK

Official Node.js SDK for the [ZipTax API](https://www.zip-tax.com/) - Get accurate sales and use tax rates for any US address.

[![npm version](https://badge.fury.io/js/ziptax.svg)](https://www.npmjs.com/package/ziptax)
[![Test](https://github.com/ziptax/ziptax-node/actions/workflows/test.yml/badge.svg)](https://github.com/ziptax/ziptax-node/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/ziptax/ziptax-node/branch/main/graph/badge.svg)](https://codecov.io/gh/ziptax/ziptax-node)

## Features

- ✅ Full TypeScript support with comprehensive type definitions
- ✅ Promise-based async/await API
- ✅ Automatic retry logic with exponential backoff
- ✅ Request/response logging
- ✅ Comprehensive error handling
- ✅ Support for both CommonJS and ES Modules
- ✅ Zero runtime dependencies (except axios)
- ✅ 80%+ test coverage

## Installation

```bash
npm install ziptax
```

## Quick Start

```typescript
import { ZiptaxClient } from 'ziptax';

// Initialize the client with your API key
const client = new ZiptaxClient({
  apiKey: 'your-api-key-here',
});

// Get sales tax rate by address
const result = await client.getSalesTaxByAddress({
  address: '200 Spectrum Center Drive, Irvine, CA 92618',
});

console.log('Total Tax Rate:', result.taxSummaries?.[0]?.rate);
console.log('Base Rates:', result.baseRates);
```

## API Reference

### Client Initialization

```typescript
const client = new ZiptaxClient({
  apiKey: 'your-api-key-here',
  baseURL?: 'https://api.zip-tax.com', // Optional: Override base URL
  timeout?: 30000, // Optional: Request timeout in ms
  enableLogging?: false, // Optional: Enable request/response logging
  retryOptions?: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
});
```

### Get Sales Tax by Address

Returns sales and use tax rate details from an address input.

```typescript
const result = await client.getSalesTaxByAddress({
  address: '200 Spectrum Center Drive, Irvine, CA 92618',
  taxabilityCode?: '12345', // Optional: Product/service taxability code
  countryCode?: 'USA', // Optional: 'USA' or 'CAN' (default: 'USA')
  historical?: '2024-01', // Optional: Historical date (YYYY-MM format)
  format?: 'json', // Optional: 'json' or 'xml' (default: 'json')
});
```

### Get Sales Tax by Geolocation

Returns sales and use tax rate details from a geolocation input.

```typescript
const result = await client.getSalesTaxByGeoLocation({
  lat: '33.65253',
  lng: '-117.74794',
  countryCode?: 'USA', // Optional: 'USA' or 'CAN' (default: 'USA')
  historical?: '2024-01', // Optional: Historical date (YYYY-MM format)
  format?: 'json', // Optional: 'json' or 'xml' (default: 'json')
});
```

### Get Account Metrics

Returns account metrics and usage information.

```typescript
const metrics = await client.getAccountMetrics();

console.log('Requests:', metrics.core_request_count, '/', metrics.core_request_limit);
console.log('Usage:', metrics.core_usage_percent.toFixed(2), '%');
```

## Response Types

All methods return fully typed responses:

```typescript
interface V60Response {
  metadata: V60Metadata;
  baseRates?: V60BaseRate[];
  service: V60Service;
  shipping: V60Shipping;
  sourcingRules?: V60SourcingRules;
  taxSummaries?: V60TaxSummary[];
  addressDetail: V60AddressDetail;
}

interface V60AccountMetrics {
  core_request_count: number;
  core_request_limit: number;
  core_usage_percent: number;
  geo_enabled: boolean;
  geo_request_count: number;
  geo_request_limit: number;
  geo_usage_percent: number;
  is_active: boolean;
  message: string;
}
```

See the [full type definitions](./src/models/responses.ts) for complete details.

**Note:** Most API responses use camelCase field names (e.g., `baseRates`, `taxSummaries`), but account metrics use snake_case (e.g., `core_request_count`, `geo_enabled`).

## Error Handling

The SDK provides specific error types for different failure scenarios:

```typescript
import {
  ZiptaxError,
  ZiptaxAPIError,
  ZiptaxAuthenticationError,
  ZiptaxValidationError,
  ZiptaxNetworkError,
  ZiptaxRateLimitError,
} from 'ziptax';

try {
  const result = await client.getSalesTaxByAddress({
    address: '200 Spectrum Center Drive',
  });
} catch (error) {
  if (error instanceof ZiptaxAuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof ZiptaxValidationError) {
    console.error('Invalid request parameters:', error.message);
  } else if (error instanceof ZiptaxRateLimitError) {
    console.error('Rate limit exceeded. Retry after:', error.retryAfter);
  } else if (error instanceof ZiptaxNetworkError) {
    console.error('Network error:', error.message);
  } else if (error instanceof ZiptaxAPIError) {
    console.error('API error:', error.statusCode, error.message);
  } else if (error instanceof ZiptaxError) {
    console.error('ZipTax error:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Advanced Usage

### Concurrent Requests

```typescript
// Fetch tax rates for multiple addresses in parallel
const addresses = [
  '200 Spectrum Center Drive, Irvine, CA 92618',
  '1600 Amphitheatre Parkway, Mountain View, CA 94043',
];

const results = await Promise.all(
  addresses.map((address) => client.getSalesTaxByAddress({ address }))
);
```

### Custom Retry Configuration

```typescript
const client = new ZiptaxClient({
  apiKey: 'your-api-key-here',
  retryOptions: {
    maxAttempts: 5,
    initialDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    shouldRetry: (error, attempt) => {
      // Custom retry logic
      return attempt < 3 && error.name === 'ZiptaxNetworkError';
    },
  },
});
```

### Enable Logging

```typescript
const client = new ZiptaxClient({
  apiKey: 'your-api-key-here',
  enableLogging: true, // Logs all requests and responses
});
```

## Examples

See the [examples](./examples) directory for more usage examples:

- [Basic Usage](./examples/basic-usage.ts)
- [Async Operations](./examples/async-usage.ts)
- [Error Handling](./examples/error-handling.ts)

### Running Examples

All examples require a valid ZipTax API key set as an environment variable:

```bash
# Run basic usage example
ZIPTAX_API_KEY=your-api-key npm run example:basic

# Run async operations example
ZIPTAX_API_KEY=your-api-key npm run example:async

# Run error handling example
ZIPTAX_API_KEY=your-api-key npm run example:errors
```

Or export the environment variable first:

```bash
export ZIPTAX_API_KEY=your-api-key
npm run example:basic
```

## Requirements

- Node.js >= 18.0.0
- npm or yarn

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Format code
npm run format

# Type check
npm run type-check

# Build the package
npm run build
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Support

- Documentation: [https://www.zip-tax.com/documentation](https://www.zip-tax.com/documentation)
- Email: support@zip.tax
- Issues: [GitHub Issues](https://github.com/ziptax/ziptax-node/issues)

## Links

- [npm package](https://www.npmjs.com/package/ziptax)
- [GitHub repository](https://github.com/ziptax/ziptax-node)
- [ZipTax API Documentation](https://www.zip-tax.com/documentation)
- [Changelog](./CHANGELOG.md)