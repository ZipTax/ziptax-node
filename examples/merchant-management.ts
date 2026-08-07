/**
 * Merchant Management example for ZipTax SDK
 *
 * Creates a self-managed merchant, reads it back, updates it, lists the
 * account's merchants, then cleans up.
 *
 * Merchant Management is a Private Preview feature. Contact support@zip.tax for
 * access. Your account must have a Company Name configured before any merchant
 * can be created.
 *
 * Usage:
 *   ZIPTAX_API_KEY=your-api-key npm run example:merchants
 */

import { ZiptaxClient } from '../src';

async function main() {
  const apiKey = process.env.ZIPTAX_API_KEY || '';

  if (!apiKey) {
    console.error('Error: Please set ZIPTAX_API_KEY');
    console.error('Usage: ZIPTAX_API_KEY=your-api-key npm run example:merchants');
    process.exit(1);
  }

  const client = new ZiptaxClient({ apiKey });

  console.log('ZipTax SDK Merchant Management Example');
  console.log('=======================================\n');

  try {
    // Step 1: create a self-managed merchant. The API default is `taxcloud`,
    // which sends a TaxCloud invite, so pass self-managed explicitly.
    console.log('1. Creating a self-managed merchant...');
    const created = await client.createMerchant({
      merchantName: 'Acme Outfitters',
      contactFirst: 'Jane',
      contactLast: 'Doe',
      contactEmail: 'jane@acmeoutfitters.com',
      referenceId: `acct-${Date.now()}`,
      merchant_type: 'self-managed',
    });

    console.log('Merchant created:', created.merchantId);
    console.log('---\n');

    const merchantId = created.merchantId;

    // Step 2: read it back. merchant_type is not returned; status is how you
    // tell the compliance models apart.
    console.log('2. Retrieving the merchant...');
    const merchant = await client.getMerchant(merchantId);
    console.log('Name:', merchant.merchantName);
    console.log('Contact:', merchant.contactEmail);
    console.log('Status:', merchant.status, '(self-managed => external_compliance)');
    console.log('---\n');

    // Step 3: update contact details
    console.log('3. Updating the merchant...');
    await client.updateMerchant({
      merchantId,
      update: {
        merchantName: 'Acme Outfitters LLC',
        contactFirst: 'Jane',
        contactLast: 'Doe',
        contactEmail: 'billing@acmeoutfitters.com',
        referenceId: merchant.referenceId,
      },
    });
    const afterUpdate = await client.getMerchant(merchantId);
    console.log('Updated name:', afterUpdate.merchantName);
    console.log('Updated contact:', afterUpdate.contactEmail);
    console.log('---\n');

    // Step 4: list every merchant on the account
    console.log('4. Listing merchants...');
    const merchants = await client.listMerchants();
    console.log('Total merchants:', merchants.length);
    for (const m of merchants.slice(0, 5)) {
      console.log(`  ${m.merchantId}  ${m.status.padEnd(22)}  ${m.merchantName}`);
    }
    console.log('---\n');

    // Step 5: calculate cart tax for the self-managed merchant. This runs on
    // the Ziptax rate engine and is stateless, so it cannot become an order.
    console.log('5. Calculating cart tax for the self-managed merchant...');
    const cart = await client.calculateCart({
      merchantId,
      items: [
        {
          customerId: 'customer-123',
          currency: { currencyCode: 'USD' },
          origin: {
            line1: '323 Washington Ave N',
            city: 'Minneapolis',
            state: 'MN',
            zip: '55401',
          },
          destination: {
            line1: '200 Spectrum Center Dr',
            city: 'Irvine',
            state: 'CA',
            zip: '92618',
          },
          lineItems: [{ index: 0, itemId: 'sku-1001', price: 49.99, quantity: 2 }],
        },
      ],
    });

    const line = cart.items?.[0]?.lineItems?.[0];
    console.log('Rate:', line?.tax.rate);
    console.log('Tax amount:', line?.tax.amount);
    console.log('---\n');

    // Step 6: clean up. This is a soft delete.
    console.log('6. Deleting the merchant...');
    const deleted = await client.deleteMerchant(merchantId);
    console.log(deleted.message);
    console.log('---\n');

    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

main();
