# API Coverage

Which Ziptax API endpoints this SDK exposes, and which it deliberately does not.

## Sources of truth

1. **[docs.zip.tax](https://docs.zip.tax)** decides what is *public*. An endpoint
   is only exposed here if it appears in the documentation's API Reference. The
   section index at `https://docs.zip.tax/v-6-0/llms.txt` is the canonical list;
   append `.md` to any docs URL for clean Markdown.
2. **[api.zip-tax.com/openapi.json](https://api.zip-tax.com/openapi.json)**
   decides the *shape*. A snapshot lives at [openapi.json](./openapi.json);
   refresh it with:

   ```bash
   curl -sL https://api.zip-tax.com/openapi.json -o docs/openapi.json
   ```

3. **[ZipTax/ziptax-api](https://github.com/ZipTax/ziptax-api)** settles
   disagreements between the two. Routes are registered in
   `internal/server/router.go` and `internal/middleware/huma_operations.go`;
   response models live in `internal/middleware/huma_schemas.go`.

Where the published OpenAPI schema and the documentation disagree, **the
documentation wins** — it reflects what callers actually receive. The TIC search
response is the known case: the OpenAPI schema declares
`{ tic, name, label }`, but the endpoint proxies an upstream payload and returns
`{ ticId, label, naturalLabel, description, documentation, rank, score }` as the
docs show.

## Exposed

| SDK method | Endpoint | Notes |
| --- | --- | --- |
| `getSalesTaxByAddress()` | `GET /request/v60` | |
| `getSalesTaxByGeoLocation()` | `GET /request/v60` | `lat` + `lng` |
| `getRatesByPostalCode()` | `GET /request/v60` | `postalcode` only; returns the multi-result shape |
| `getAccountMetrics()` | `GET /account/v60/metrics` | |
| `getAccountUsage()` | `GET /account/metrics` | core / geo / merchant quotas |
| `searchProductCodes()` | `POST /search/tic` | |
| `recommendProductCode()` | `POST /search/tic/recommend` | |
| `getTicData()` | `GET /data/tic` | public, no key required |
| `getTicSearchSchema()` | `GET /schemas/ticsearch` | |
| `getHealth()` | `GET /system/health` | public, no key required |
| `getSystemMetadata()` | `GET /system/metadata` | public, no key required |
| `createMerchant()` | `POST /merchant/create` | Private Preview |
| `updateMerchant()` | `POST /merchant/update` | Private Preview |
| `getMerchant()` | `POST /merchant/get` | Private Preview |
| `listMerchants()` | `GET /merchant/list` | Private Preview |
| `deleteMerchant()` | `POST /merchant/delete` | Private Preview, soft delete |
| `setMerchantCredentials()` | `POST /merchant/credentials/set` | Private Preview |
| `deleteMerchantCredentials()` | `POST /merchant/credentials/delete` | Private Preview |
| `calculateCart()` | `POST /merchant/cart/calculate` | response varies by merchant model |
| `createOrder()` | `POST /merchant/order/create` | |
| `createOrderFromCart()` | `POST /merchant/order/create-from-cart` | TaxCloud-connected only |
| `getOrder()` | `POST /merchant/order/get` | |
| `updateOrder()` | `POST /merchant/order/update` | |
| `refundOrder()` | `POST /merchant/refund/create` | |
| `createExemptionCertificate()` | `POST /merchant/cert/create` | |
| `getExemptionCertificate()` | `POST /merchant/cert/get` | |
| `listExemptionCertificates()` | `POST /merchant/cert/list` | cursor pagination |
| `deleteExemptionCertificate()` | `POST /merchant/cert/delete` | |

Merchant Transactions endpoints accept an `X-ENV` header (`LIVE` or `TEST`),
supplied by the client's `environment` option or a per-call `RequestOptions`.

## Not exposed

| Endpoint | Why |
| --- | --- |
| `POST /merchant/credentials/get` | Live, but absent from the public API Reference |
| `POST /calculate/cart` | Live, but absent from the API Reference; superseded by `/merchant/cart/calculate` |
| `GET /request/v10` … `/request/v50` | Superseded; only v6.0 is documented |
| `GET /request/v40/activate` | Internal, undocumented |
| `GET /account/v50/metrics` | Superseded by the v6.0 and unversioned metrics endpoints |

Also excluded, at the field level:

| Field value | Why |
| --- | --- |
| `merchant_type: 'connected'` / `'offline'` | In the API's enum, but legacy aliases it normalizes to `taxcloud` and `self-managed` (see `legacyMerchantTypeTaxCloud` / `legacyMerchantTypeSelfManaged` in `controllers/merchant/handler.go`). Undocumented, so `MerchantType` offers only the two documented models |

Narrowing a **request** field like this is safe, because it only restricts what
the SDK will send. Do not narrow a **response** field the same way: the API can
return values the docs do not list, and a closed union makes a valid response
unassignable. `V60BaseRate.jurType` and `V60TaxSummary.taxType` are deliberately
left open for that reason — the published enums describe only the
`countryCode=USA` path, while `countryCode=CAN` returns `GST`/`PST` and `Sales`.

## No API surface

These are documented features with no endpoints, so the SDK cannot cover them:

- **Nexus Management** and **Economic Thresholds** — managed in the platform UI
  (`Develop`/merchant pages). `POST /merchant/update` does not accept nexus
  fields, and `merchant_type` cannot be changed through the API.
- **Webhook endpoint and subscription configuration** — managed in the dashboard
  under `Develop > Events`. The SDK covers the receiving side instead:
  `verifyWebhookSignature()`, `parseWebhookEvent()`, `parseWebhookTimestamp()`,
  and the event payload types.

## Adding an endpoint

1. Confirm it appears in the docs API Reference. If it does not, it stays
   unexposed — add a row to **Not exposed** above with the reason.
2. Take the request and response shape from `openapi.json`, cross-checked
   against the docs page for that endpoint.
3. Add types to `src/models/` (`responses.ts`, `merchant.ts`, `transactions.ts`,
   or `webhooks.ts`), then the client method with JSDoc and validation.
4. Export from `src/index.ts`.
5. Add tests, update the README and CHANGELOG, and bump the version.
6. Annotate anything in Private Preview or active development `@experimental`.
