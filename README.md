# Ziptax Node.js SDK

Official Node.js SDK for the [Ziptax API](https://www.zip-tax.com/) - Get accurate sales and use tax rates for any US or Canadian address, and run tax compliance for the merchants on your platform.

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
- ✅ Rate lookups by address, coordinate, and postal code
- ✅ Product taxability codes (TICs), including search and AI recommendation
- ✅ Merchant management, cart tax, orders, exemption certificates, and refunds
- ✅ Webhook signature verification

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

## Feature availability

Merchant Management is a **Private Preview** feature and Merchant Transactions
(cart, orders, exemption certificates, refunds) is **in active development**.
Methods for both are annotated `@experimental`: their request and response
shapes may change before general availability. Contact
[support@zip.tax](mailto:support@zip.tax) for access.

Rate lookups, product codes, account metrics, and the system endpoints are
generally available.

## API Reference

### Client Initialization

```typescript
import { ZiptaxClient } from '@ziptax/node-sdk';

const client = new ZiptaxClient({
  apiKey: 'your-api-key-here',
  // Optional
  baseURL: 'https://api.zip-tax.com',
  timeout: 30000,
  enableLogging: false,
  environment: 'LIVE', // or 'TEST' for a merchant's sandbox
});
```

One API key covers everything. Merchant TaxCloud credentials are stored
server-side with [`setMerchantCredentials()`](#merchant-credentials), so your
integration only ever handles your own Ziptax key.

### Get Sales Tax by Address

```typescript
const result = await client.getSalesTaxByAddress({
  address: '200 Spectrum Center Drive, Irvine, CA 92618',
  // Optional
  taxabilityCode: '20010',        // product TIC, or an override code like 'CIR00001'
  countryCode: 'USA',             // USA | CAN | PRI | ASM | GUM | MNP | VIR
  historical: '202401',           // YYYYMM
  addressDetailExtended: true,    // adds addressDetail.address breakdown
  shippingExtended: true,         // adds shipping.shippingExtended detail
  city: 'Irvine',                 // disambiguators, when the address is partial
  state: 'CA',
  county: 'Orange',
});

console.log(result.taxSummaries?.[0]?.rate);

// Product-specific rules, present when taxabilityCode is supplied
console.log(result.productDetail?.taxabilityCode.rateRules);
```

`countryCode: 'CAN'` requires the `rate_loc_can` entitlement, and
`taxabilityCode` requires `product_rates`. US territories need no extra
entitlement.

#### Canadian responses differ in shape

`countryCode: 'CAN'` is served by a separate path, so a few fields diverge from
the US response. The types account for this, but your code should too:

| Field | USA (and US territories) | Canada |
| --- | --- | --- |
| `baseRates[].jurType` | `US_STATE_SALES_TAX`, `US_COUNTY_SALES_TAX`, … | `GST`, `PST` |
| `taxSummaries[].taxType` | `SALES_TAX`, `USE_TAX` | `Sales` |
| `taxSummaries[].displayRates[].name` | jurisdiction names | `GST`, `PST`, `HST`, `QST` |
| `service` | present | **absent** |
| `sourcingRules` | present | **absent** |

So `service` and `sourcingRules` are optional, and `jurType` / `taxType` are
open-ended string unions rather than closed enums — the API can add jurisdiction
types without an SDK release, and the published OpenAPI enums describe only the
US path. Known values still autocomplete:

```typescript
const result = await client.getSalesTaxByAddress({
  address: '100 Queen St W, Toronto, ON',
  countryCode: 'CAN',
});

// Guard rather than assuming these exist
console.log(result.service?.taxable);
console.log(result.sourcingRules?.value);

for (const rate of result.baseRates ?? []) {
  switch (rate.jurType) {
    case 'GST':
    case 'PST':
      console.log('Canadian component:', rate.jurType, rate.rate);
      break;
    default:
      console.log('Other jurisdiction:', rate.jurType, rate.rate);
  }
}
```

`service.taxable` and `shipping.taxable` share one `V60Taxability` type of
`'Y' | 'N' | 'L'`, where `L` means only the labor or handling portion is taxable
when separately stated. Read `taxable` rather than parsing `description`: the API
does not currently render distinct text for `L` on shipping.

### Get Sales Tax by Geolocation

```typescript
const result = await client.getSalesTaxByGeoLocation({
  lat: 33.65253,   // -90 to 90
  lng: -117.74794, // -180 to 180
});
```

### Get Sales Tax by Postal Code

A postal-code-only lookup can overlap several jurisdictions, so it returns a
multi-result shape rather than one resolved rate.

```typescript
const result = await client.getRatesByPostalCode({
  postalcode: '92694',
  state: 'CA', // optional, narrows overlapping jurisdictions
});

for (const row of result.results) {
  console.log(row.geoCity, row.taxSales);
}
```

### Get Account Metrics

```typescript
// Request count, limit, and usage percentage
const metrics = await client.getAccountMetrics();
console.log(metrics.request_count, '/', metrics.request_limit);

// Per-quota breakdown, including merchant requests
const usage = await client.getAccountUsage();
console.log('Core:', usage.core_usage_percent, '%');
console.log('Geo:', usage.geo_usage_percent, '%');
console.log('Merchant:', usage.merchant_usage_percent, '%');
```

Merchant Transactions are metered separately from tax lookups. Each transaction
call counts against your merchant allowance, not your rate-request allowance.

### Product Codes (TICs)

```typescript
// Search: all matching TICs, ranked and scored
const search = await client.searchProductCodes('baked bread in plastic packaging');
for (const hit of search.results ?? []) {
  console.log(hit.ticId, hit.label, hit.score);
}

// Recommend: one best match, higher accuracy, slightly higher latency
const rec = await client.recommendProductCode('baked bread in plastic packaging');
const prediction = rec.predictions[0];
if (prediction.status === 'success') {
  console.log(prediction.ticId, prediction.label);
}

// The full TIC catalog, including the category hierarchy
const catalog = await client.getTicData();
console.log(catalog.tic_list?.length, 'codes');
```

Use a `ticId` as `taxabilityCode` on rate lookups (as a string) or as `tic` on
cart and order line items (as a number).

### System

Both endpoints are public and need no API key.

```typescript
const health = await client.getHealth();
console.log(health.status, health.components.taxdata_count);

const metadata = await client.getSystemMetadata();
console.log(metadata.go_version, metadata.hostname);
```

## Merchant Management

Provision tax compliance for the merchants on your platform. Each merchant picks
one of two compliance models at creation, set by `merchant_type`:

| | Self-managed | TaxCloud-connected |
| --- | --- | --- |
| `merchant_type` | `'self-managed'` | `'taxcloud'` (default) |
| Activation | Active immediately, no invite | Invite sent to `contactEmail` |
| Status on reads | `external_compliance` | `taxcloud_invited` → `taxcloud_connected` |
| Registration, filing, remittance | The merchant's own | TaxCloud handles all three |
| Cart tax calculation | Ziptax rate engine, stateless | TaxCloud, can become an order |
| Orders, certificates, refunds | Not available (`403`) | Available once connected |

`merchant_type` is not returned on reads. Use `status` to tell the models apart.

```typescript
// Create
const { merchantId } = await client.createMerchant({
  merchantName: 'Acme Outfitters',
  contactFirst: 'Jane',
  contactLast: 'Doe',
  contactEmail: 'jane@acmeoutfitters.com',
  referenceId: 'acct-10482',
  merchant_type: 'self-managed',
});

// Read
const merchant = await client.getMerchant(merchantId);
console.log(merchant.status); // 'external_compliance'

// List
const merchants = await client.listMerchants();

// Update (name, contact, referenceId - not merchant_type)
await client.updateMerchant({
  merchantId,
  update: { merchantName: 'Acme Outfitters LLC' },
});

// Soft-delete
await client.deleteMerchant(merchantId);
```

Your account needs a Company Name configured before any merchant can be created,
otherwise the API returns `400`. Reusing a `referenceId` returns `409`.

Nexus Management and Economic Thresholds are managed in the platform UI and have
no API surface, so the SDK does not cover them.

### Merchant Credentials

Store a TaxCloud-connected merchant's credentials once. Ziptax encrypts them at
rest and resolves them server-side on every transaction call.

```typescript
await client.setMerchantCredentials({
  merchantId,
  connectionId: 'taxcloud-connection-id',
  apiKey: 'taxcloud-api-key',
});

await client.deleteMerchantCredentials(merchantId);
```

A merchant with no credentials on file returns `404` on every transaction call.

## Merchant Transactions

Every transaction call takes a `merchantId`. Set `environment: 'TEST'` on the
client, or pass `{ environment: 'TEST' }` per call, to run against the merchant's
sandbox instead of Live.

### Calculate Cart Tax

```typescript
import { isTaxCloudCartResponse } from '@ziptax/node-sdk';

const result = await client.calculateCart({
  merchantId,
  items: [
    {
      customerId: 'customer-453',
      currency: { currencyCode: 'USD' },
      origin: { line1: '1 Market St', city: 'San Francisco', state: 'CA', zip: '94105' },
      destination: { line1: '200 Spectrum Center Dr', city: 'Irvine', state: 'CA', zip: '92618' },
      lineItems: [
        { index: 0, itemId: 'sku-1001', price: 49.99, quantity: 2, tic: 0 },
      ],
      // Optional
      deliveredBySeller: false,
      exemption: { exemptionId: 'cert-1' },
      discounts: {
        lineItemDiscounts: [{ itemId: 'sku-1001', type: 'percentage', value: 0.1 }],
        orderDiscount: { type: 'amount', value: 5 },
      },
    },
  ],
});

// A TaxCloud-connected merchant returns a connectionId and a convertible cartId.
// A self-managed merchant is calculated by the Ziptax engine and is stateless.
if (isTaxCloudCartResponse(result)) {
  console.log(result.connectionId);
  console.log(result.items?.[0].cartId); // pass to createOrderFromCart
}
```

`items` accepts 1-100 carts. Each line item needs a unique `index` (0-500).

Cart calculation does not check the merchant's nexus footprint: it returns the
rate for the sourced address whether or not the merchant has an obligation to
collect there.

### Orders

```typescript
// From a calculated cart (TaxCloud-connected merchants only)
const order = await client.createOrderFromCart({
  merchantId,
  cartId: 'cart-abc',
  orderId: 'order-1001',
  completedDate: new Date().toISOString(),
});

// Or directly, supplying the tax you collected
await client.createOrder({
  merchantId,
  orderId: 'order-1002',
  customerId: 'customer-453',
  transactionDate: new Date().toISOString(),
  completedDate: new Date().toISOString(),
  origin: { line1: '1 Market St', city: 'San Francisco', state: 'CA', zip: '94105' },
  destination: { line1: '200 Spectrum Center Dr', city: 'Irvine', state: 'CA', zip: '92618' },
  currency: { currencyCode: 'USD' },
  lineItems: [
    { index: 0, itemId: 'sku-1001', price: 49.99, quantity: 2, tic: 0,
      tax: { rate: 0.0775, amount: 7.75 } },
  ],
  // Optional
  kind: 'order',              // or 'credit'
  channel: 'amazon',          // marketplace-facilitated, excluded from filing
  excludeFromFiling: false,
});

// Retrieve, optionally with refunds attached
const fetched = await client.getOrder({ merchantId, orderId: 'order-1001', expand: 'refunds' });

// Mark when the order shipped, creating the tax liability
await client.updateOrder({
  merchantId,
  orderId: 'order-1001',
  completedDate: new Date().toISOString(),
});
```

### Refunds

```typescript
// Partial refund
const refund = await client.refundOrder({
  merchantId,
  orderId: 'order-1001',
  items: [{ itemId: 'sku-1001', quantity: 1 }],
});

// Full refund - omit items
await client.refundOrder({ merchantId, orderId: 'order-1001' });
```

Never retry a refund blindly: a duplicate refund is a financial incident. If a
call times out, confirm with `getOrder({ ..., expand: 'refunds' })` first.

### Exemption Certificates

```typescript
const cert = await client.createExemptionCertificate({
  merchantId,
  customerId: 'customer-453',
  customerName: 'Acme Supply Co',
  customerBusinessType: 'WholesaleTrade',
  reason: 'Resale',
  reasonDescription: 'Resale',   // max 20 characters
  address: { line1: '200 Spectrum Center Dr', city: 'Irvine', state: 'CA', zip: '92618' },
  states: [{ abbreviation: 'CA' }, { abbreviation: 'NY' }],
});

await client.getExemptionCertificate({ merchantId, certificateId: cert.certificateId });

// Paginate with the previous response's nextCursor
let cursor: string | undefined;
do {
  const page = await client.listExemptionCertificates({ merchantId, limit: 50, cursor });
  cursor = page.nextCursor ?? undefined;
} while (cursor);

await client.deleteExemptionCertificate({ merchantId, certificateId: cert.certificateId });
```

Carts and orders submitted with a matching `customerId` are matched against the
certificate automatically.

### Retries and idempotency

The SDK picks a retry policy per operation, so a write whose outcome is unknown
is never silently re-sent:

| Operation | SDK behavior |
| --- | --- |
| Rate lookups, account metrics, TIC and system endpoints | Retried on network errors and `5xx` |
| `getOrder`, `getExemptionCertificate`, `listExemptionCertificates` | Retried on network errors and `5xx` — these are reads |
| `calculateCart` | Retried **only when no response arrived** (connection failure or timeout). A `5xx` means the service answered and may already have stored a cart, and every call is metered |
| `createOrder`, `createOrderFromCart`, `updateOrder`, `createExemptionCertificate`, `deleteExemptionCertificate` | **Never retried.** Re-sending can duplicate or clobber |
| `refundOrder` | **Never retried.** A duplicate refund is a financial incident |

On a `502`, `504`, or timeout from a write, the SDK surfaces the original error
immediately. Treat it as an **unknown outcome**: the compliance service may have
committed the change before the connection broke. Confirm before retrying.

```typescript
try {
  await client.refundOrder({ merchantId, orderId, items });
} catch (error) {
  if (error instanceof ZiptaxAPIError && [502, 504].includes(error.statusCode ?? 0)) {
    // The refund may or may not have been recorded. Check before acting.
    const order = await client.getOrder({ merchantId, orderId, expand: 'refunds' });
    if (!order.refunds?.length) {
      // Safe to retry now.
    }
  }
}
```

If you have your own idempotency handling, opt a write back into retrying per
call:

```typescript
await client.createOrder(request, {
  retryOptions: { maxAttempts: 3 },
});
```

Do this on `refundOrder` only if you can guarantee a duplicate refund is
impossible. The client-wide `retryOptions` still applies to everything else; a
per-call value overrides it.

## Event Webhooks

Endpoints and event subscriptions are configured in the platform dashboard under
**Develop > Events**. There is no API for managing them. The SDK covers
verification and typing of the deliveries you receive.

```typescript
import express from 'express';
import { verifyWebhookSignature, parseWebhookEvent } from '@ziptax/node-sdk';

const app = express();

// Capture the RAW body. Verification must run on the exact bytes received,
// not on a re-serialized JSON object.
app.use(express.raw({ type: 'application/json' }));

app.post('/webhooks/ziptax', (req, res) => {
  const signature = req.get('X-Signature');

  if (!verifyWebhookSignature(req.body, signature, process.env.ZIPTAX_SIGNING_SECRET!)) {
    return res.sendStatus(401);
  }

  const { event, data } = JSON.parse(req.body.toString());
  // ...handle the verified event...

  res.sendStatus(200);
});
```

`parseWebhookEvent()` verifies and parses in one step, throwing
`ZiptaxValidationError` on a bad signature or malformed body:

```typescript
import { parseWebhookEvent, parseWebhookTimestamp, RateUpdatedEvent } from '@ziptax/node-sdk';

const event = parseWebhookEvent(rawBody, signature, signingSecret) as RateUpdatedEvent;

console.log(event.data.rateUpdateDetail.locality); // 'USA-STATE' | 'CAN-PROVINCE'
console.log(event.data.rateUpdateDetail.code);     // e.g. 'CA'
console.log(parseWebhookTimestamp(event.timestamp));
```

The event body is a trigger, not the rate data. Call the rate API for the named
authority to read the new values. Use `parseWebhookTimestamp()` rather than
`new Date(event.timestamp)`: the API formats the timestamp with a space
separator, which is not strict ISO-8601.

## Response Types

All response types are exported for use in your own code:

```typescript
import type {
  // Rate lookups
  V60Response,
  V60BaseRate,
  V60TaxSummary,
  V60ProductDetail,
  V60AddressComponents,
  V60ShippingExtended,
  V60PostalCodeResponse,
  // Account and system
  V60AccountMetrics,
  AccountUsageMetrics,
  HealthResponse,
  SystemMetadataResponse,
  // Product codes
  TicDataResponse,
  ProductCodeSearchResponse,
  ProductCodeRecommendationResponse,
  // Merchants
  Merchant,
  MerchantType,
  MerchantStatus,
  // Transactions
  Cart,
  CalculateCartRequest,
  CalculateCartResponse,
  SelfManagedCalculateCartResponse,
  AnyCalculateCartResponse,
  OrderResponse,
  RefundResponse,
  CertificateResponse,
  ListCertificatesResponse,
  // Webhooks
  RateUpdatedEvent,
} from '@ziptax/node-sdk';
```

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

### Merchant endpoint status codes

| Status | Error type | Meaning |
| --- | --- | --- |
| `400` | `ZiptaxAPIError` | Malformed JSON, or a missing/invalid `merchantId` or resource id |
| `401` | `ZiptaxAuthenticationError` | Missing, invalid, or inactive API key |
| `403` | `ZiptaxAPIError` | Merchant unknown or not owned by your account, or the operation is unavailable for a self-managed merchant |
| `404` | `ZiptaxAPIError` | Merchant has no compliance credentials on file |
| `429` | `ZiptaxRateLimitError` | Rate limit exceeded (response code `108`) |
| `422` | `ZiptaxAPIError` | Operation-level validation error; `message` carries the API's `detail` |
| `502`/`504` | `ZiptaxAPIError` | Compliance service unreachable or timed out |

`403` raises `ZiptaxAPIError`, not `ZiptaxAuthenticationError`: on these routes
it signals a merchant or capability problem rather than a credential one.

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

## Migrating from 0.2.x

TaxCloud access moved from a direct connection to Ziptax-proxied merchant
endpoints. The client no longer talks to `api.v3.taxcloud.com`.

**1. Drop the TaxCloud client options.** Store each merchant's credentials once
instead:

```diff
- const client = new ZiptaxClient({
-   apiKey: 'ziptax-key',
-   taxCloudConnectionId: 'uuid',
-   taxCloudAPIKey: 'taxcloud-key',
- });
+ const client = new ZiptaxClient({ apiKey: 'ziptax-key' });
+
+ await client.setMerchantCredentials({
+   merchantId,
+   connectionId: 'uuid',
+   apiKey: 'taxcloud-key',
+ });
```

**2. Pass `merchantId` on every cart, order, certificate, and refund call.**

**3. Replace single-string cart addresses with structured ones, add a line-item
`index`, and rename `taxabilityCode` to `tic`:**

```diff
  await client.calculateCart({
+   merchantId,
    items: [{
      customerId: 'customer-453',
      currency: { currencyCode: 'USD' },
-     origin: { address: '1 Market St, San Francisco, CA 94105' },
-     destination: { address: '200 Spectrum Center Dr, Irvine, CA 92618' },
-     lineItems: [{ itemId: 'sku-1001', price: 49.99, quantity: 2, taxabilityCode: 0 }],
+     origin: { line1: '1 Market St', city: 'San Francisco', state: 'CA', zip: '94105' },
+     destination: { line1: '200 Spectrum Center Dr', city: 'Irvine', state: 'CA', zip: '92618' },
+     lineItems: [{ index: 0, itemId: 'sku-1001', price: 49.99, quantity: 2, tic: 0 }],
    }],
  });
```

`parseAddressString()` is gone; the endpoints take structured addresses directly.

**4. Order and refund methods now take a single request object:**

```diff
- await client.getOrder('order-1001');
- await client.updateOrder('order-1001', { completedDate });
- await client.refundOrder('order-1001', { items });
+ await client.getOrder({ merchantId, orderId: 'order-1001' });
+ await client.updateOrder({ merchantId, orderId: 'order-1001', completedDate });
+ await client.refundOrder({ merchantId, orderId: 'order-1001', items });
```

`refundOrder()` now returns a single `RefundResponse` instead of an array.

**5. Coordinates are numbers:**

```diff
- await client.getSalesTaxByGeoLocation({ lat: '33.65253', lng: '-117.74794' });
+ await client.getSalesTaxByGeoLocation({ lat: 33.65253, lng: -117.74794 });
```

**6. TIC search fields are numbers, not strings.** `ticId`, `rank`, and `score`
were typed `string`; the API returns numbers. Remove any `parseFloat`/`parseInt`
around them.

**7. `403` now raises `ZiptaxAPIError`,** not `ZiptaxAuthenticationError`. Update
any handler that keyed off the auth error to catch a 403.

See the [CHANGELOG](./CHANGELOG.md) for the complete list.

## Examples

See the [examples](./examples) directory for more usage examples:

- [Basic Usage](./examples/basic-usage.ts) - rate lookups and account metrics
- [Async Operations](./examples/async-usage.ts) - concurrent requests
- [Error Handling](./examples/error-handling.ts) - error handling patterns
- [Merchant Management](./examples/merchant-management.ts) - merchant CRUD and self-managed cart tax
- [Merchant Transactions](./examples/merchant-transactions.ts) - cart to order to refund
- [Webhooks](./examples/webhooks.ts) - signature verification

### Running Examples

Rate lookup examples require a valid Ziptax API key:

```bash
# Run basic usage example
ZIPTAX_API_KEY=your-api-key npm run example:basic
```

```bash
# Run async operations example
ZIPTAX_API_KEY=your-api-key npm run example:async
```

```bash
# Run error handling example
ZIPTAX_API_KEY=your-api-key npm run example:errors
```

Merchant examples require Private Preview access:

```bash
# Run merchant management example
ZIPTAX_API_KEY=your-api-key npm run example:merchants
```

```bash
# Run merchant transactions example (runs against the merchant's TEST environment)
ZIPTAX_API_KEY=your-api-key ZIPTAX_MERCHANT_ID=your-merchant-uuid npm run example:merchant
```

The webhook example needs your account's signing secret:

```bash
ZIPTAX_SIGNING_SECRET=whsec_your_secret npm run example:webhooks
```

## Requirements

- Node.js >= 18.0.0
- npm or yarn

## Development

```bash
# Install dependencies
npm install
```

```bash
# Run tests
npm test
```

```bash
# Run tests with coverage
npm run test:coverage
```

```bash
# Run linting
npm run lint
```

```bash
# Format code
npm run format
```

```bash
# Type check
npm run type-check
```

```bash
# Build the package
npm run build
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Support

- Documentation: [https://docs.zip.tax](https://docs.zip.tax)
- Email: support@zip.tax
- Issues: [GitHub Issues](https://github.com/ziptax/ziptax-node/issues)

## Links

- [npm package](https://www.npmjs.com/package/@ziptax/node-sdk)
- [GitHub repository](https://github.com/ziptax/ziptax-node)
- [Ziptax API Documentation](https://docs.zip.tax)
- [OpenAPI Specification](https://api.zip-tax.com/openapi.json)
- [Changelog](./CHANGELOG.md)
