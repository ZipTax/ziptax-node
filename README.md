# Ziptax Node.js SDK

Official Node.js SDK for the [Ziptax API](https://www.zip-tax.com/) - Get accurate sales and use tax rates for any US address.

[![npm version](https://badge.fury.io/js/%40ziptax%2Fnode-sdk.svg)](https://www.npmjs.com/package/@ziptax/node-sdk)
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
- ✅ TaxCloud order management integration (optional)

## Installation

```bash
npm install @ziptax/node-sdk
```

## Quick Start

```typescript
import { ZiptaxClient } from '@ziptax/node-sdk';

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

#### Basic Initialization (Tax Rate Lookups Only)

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

#### With TaxCloud Order Management (Optional)

```typescript
const client = new ZiptaxClient({
  apiKey: 'your-ziptax-api-key-here',
  taxCloudConnectionId: '25eb9b97-5acb-492d-b720-c03e79cf715a', // Optional: TaxCloud Connection ID (UUID)
  taxCloudAPIKey: 'your-taxcloud-api-key-here', // Optional: TaxCloud API Key
  // ... other options
});
```

**Note:** TaxCloud order management features are optional and only available when both `taxCloudConnectionId` and `taxCloudAPIKey` are provided during client initialization.

### Get Sales Tax by Address

Returns sales and use tax rate details from an address input.

```typescript
const result = await client.getSalesTaxByAddress({
  address: '200 Spectrum Center Drive, Irvine, CA 92618',
  taxabilityCode?: '12345', // Optional: Product/service taxability code
  countryCode?: 'USA', // Optional: 'USA' or 'CAN' (default: 'USA')
  historical?: '202401', // Optional: Historical date (YYYYMM format)
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
  historical?: '202401', // Optional: Historical date (YYYYMM format)
  format?: 'json', // Optional: 'json' or 'xml' (default: 'json')
});
```

### Get Sales Tax by Postal Code

Returns sales and use tax rate details from a postal code input.

```typescript
const result = await client.getRatesByPostalCode({
  postalcode: '92694', // Required: 5-digit US postal code
  format?: 'json', // Optional: 'json' or 'xml' (default: 'json')
});
```

### Get Account Metrics

Returns account metrics and usage information.

```typescript
const metrics = await client.getAccountMetrics();

console.log('Requests:', metrics.request_count, '/', metrics.request_limit);
console.log('Usage:', metrics.usage_percent.toFixed(2), '%');
```

## TaxCloud Order Management (Optional)

The SDK includes optional TaxCloud integration for order management operations. These features require TaxCloud credentials to be configured during client initialization.

### Create Order

Create orders from marketplace transactions, pre-existing systems, or bulk uploads.

```typescript
const orderResponse = await client.createOrder({
  orderId: 'my-order-1',
  customerId: 'customer-453',
  transactionDate: '2024-01-15T09:30:00Z',
  completedDate: '2024-01-15T09:30:00Z',
  origin: {
    line1: '323 Washington Ave N',
    city: 'Minneapolis',
    state: 'MN',
    zip: '55401-2427',
  },
  destination: {
    line1: '323 Washington Ave N',
    city: 'Minneapolis',
    state: 'MN',
    zip: '55401-2427',
  },
  lineItems: [
    {
      index: 0,
      itemId: 'item-1',
      price: 10.8,
      quantity: 1.5,
      tax: { amount: 1.31, rate: 0.0813 },
      tic: 0,
    },
  ],
  currency: { currencyCode: 'USD' },
});
```

### Get Order

Retrieve a specific order by its ID from TaxCloud.

```typescript
const order = await client.getOrder('my-order-1');

console.log('Order ID:', order.orderId);
console.log('Customer:', order.customerId);
console.log('Total Tax:', order.lineItems.reduce((sum, item) => sum + item.tax.amount, 0));
```

### Update Order

Update an existing order's completedDate in TaxCloud.

```typescript
const updatedOrder = await client.updateOrder('my-order-1', {
  completedDate: '2024-01-16T10:00:00Z',
});
```

### Refund Order

Create a refund against an order in TaxCloud. An order can only be refunded once, regardless of whether the order is partially or fully refunded.

```typescript
// Partial refund (specific items)
const refunds = await client.refundOrder('my-order-1', {
  items: [
    {
      itemId: 'item-1',
      quantity: 1.0,
    },
  ],
});

// Full refund (omit items or pass empty array)
const fullRefunds = await client.refundOrder('my-order-1');
```

## Response Types

All methods return fully typed responses:

### ZipTax API Response Types

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

interface V60PostalCodeResponse {
  version: string;
  rCode: number;
  results: V60PostalCodeResult[];
  addressDetail: V60PostalCodeAddressDetail;
}

interface V60AccountMetrics {
  request_count: number;
  request_limit: number;
  usage_percent: number;
  is_active: boolean;
  message: string;
}
```

### TaxCloud API Response Types

```typescript
interface OrderResponse {
  orderId: string;
  customerId: string;
  connectionId: string;
  transactionDate: string;
  completedDate: string;
  origin: TaxCloudAddressResponse;
  destination: TaxCloudAddressResponse;
  lineItems: CartItemWithTaxResponse[];
  currency: CurrencyResponse;
  channel: string | null;
  deliveredBySeller: boolean;
  excludeFromFiling: boolean;
  exemption: Exemption;
}

interface RefundTransactionResponse {
  connectionId: string;
  createdDate: string;
  items: CartItemRefundWithTaxResponse[];
  returnedDate?: string;
}
```

See the [full type definitions](./src/models/) for complete details.

**Note:** Most API responses use camelCase field names (e.g., `baseRates`, `taxSummaries`), but account metrics use snake_case (e.g., `request_count`, `is_active`).

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
} from '@ziptax/node-sdk';

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

### TaxCloud Error Handling

When using TaxCloud features, a `ZiptaxConfigurationError` will be thrown if the credentials are not configured:

```typescript
import { ZiptaxConfigurationError } from '@ziptax/node-sdk';

try {
  const order = await client.createOrder({
    orderId: 'my-order-1',
    // ... order details
  });
} catch (error) {
  if (error instanceof ZiptaxConfigurationError) {
    console.error('Please provide taxCloudConnectionId and taxCloudAPIKey during client initialization');
  } else {
    // Handle other errors
    console.error('Error creating order:', error);
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

### Working with Multiple Orders

```typescript
// Create multiple orders concurrently
const orders = [
  {
    orderId: 'order-1',
    customerId: 'customer-1',
    // ... order details
  },
  {
    orderId: 'order-2',
    customerId: 'customer-2',
    // ... order details
  },
];

const createdOrders = await Promise.all(
  orders.map((order) => client.createOrder(order))
);

console.log(`Created ${createdOrders.length} orders`);
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

- [Basic Usage](./examples/basic-usage.ts) - ZipTax tax rate lookups
- [Async Operations](./examples/async-usage.ts) - Concurrent requests
- [Error Handling](./examples/error-handling.ts) - Error handling patterns
- [TaxCloud Orders](./examples/taxcloud-orders.ts) - TaxCloud order management

### Running Examples

Basic examples require a valid ZipTax API key:

```bash
# Run basic usage example
ZIPTAX_API_KEY=your-api-key npm run example:basic

# Run async operations example
ZIPTAX_API_KEY=your-api-key npm run example:async

# Run error handling example
ZIPTAX_API_KEY=your-api-key npm run example:errors
```

TaxCloud example requires both ZipTax and TaxCloud credentials:

```bash
# Run TaxCloud order management example
ZIPTAX_API_KEY=your-api-key \
TAXCLOUD_CONNECTION_ID=your-connection-id \
TAXCLOUD_API_KEY=your-taxcloud-key \
npm run example:taxcloud
```

Or export the environment variables first:

```bash
export ZIPTAX_API_KEY=your-api-key
export TAXCLOUD_CONNECTION_ID=your-connection-id
export TAXCLOUD_API_KEY=your-taxcloud-key
npm run example:taxcloud
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

- [npm package](https://www.npmjs.com/package/@ziptax/node-sdk)
- [GitHub repository](https://github.com/ziptax/ziptax-node)
- [ZipTax API Documentation](https://www.zip-tax.com/documentation)
- [Changelog](./CHANGELOG.md)