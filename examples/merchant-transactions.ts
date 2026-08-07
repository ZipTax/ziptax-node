/**
 * Merchant Transactions example for ZipTax SDK
 *
 * Covers the full lifecycle against a TaxCloud-connected merchant: calculate a
 * cart, turn it into an order, update it, then refund part of it.
 *
 * Merchant Management is a Private Preview feature and Merchant Transactions is
 * in active development. Contact support@zip.tax for access.
 *
 * Usage:
 *   ZIPTAX_API_KEY=your-api-key \
 *   ZIPTAX_MERCHANT_ID=your-merchant-uuid \
 *   npm run example:merchant
 */

import { ZiptaxClient, isTaxCloudCartResponse } from '../src';

async function main() {
  const apiKey = process.env.ZIPTAX_API_KEY || '';
  const merchantId = process.env.ZIPTAX_MERCHANT_ID || '';

  if (!apiKey || !merchantId) {
    console.error('Error: Please set required environment variables');
    console.error('Usage:');
    console.error('  ZIPTAX_API_KEY=your-api-key \\');
    console.error('  ZIPTAX_MERCHANT_ID=your-merchant-uuid \\');
    console.error('  npm run example:merchant');
    process.exit(1);
  }

  // Point every Merchant Transactions call at the merchant's Test (sandbox)
  // environment so nothing here creates real orders or affects filings.
  const client = new ZiptaxClient({ apiKey, environment: 'TEST' });

  console.log('ZipTax SDK Merchant Transactions Example');
  console.log('=========================================\n');

  const address = {
    line1: '323 Washington Ave N',
    city: 'Minneapolis',
    state: 'MN',
    zip: '55401-2427',
  };

  try {
    // Confirm the merchant is connected. A self-managed merchant reports
    // external_compliance and can only use cart calculation.
    console.log('0. Checking the merchant...');
    const merchant = await client.getMerchant(merchantId);
    console.log('Merchant:', merchant.merchantName);
    console.log('Status:', merchant.status);
    if (merchant.status === 'external_compliance') {
      console.log(
        '\nThis merchant is self-managed. Cart calculation works, but orders, ' +
          'certificates, and refunds require a TaxCloud-connected merchant.'
      );
    }
    console.log('---\n');

    // Step 1: calculate tax for the cart
    console.log('1. Calculating cart tax...');
    const cart = await client.calculateCart({
      merchantId,
      items: [
        {
          customerId: 'customer-123',
          currency: { currencyCode: 'USD' },
          origin: address,
          destination: address,
          lineItems: [
            { index: 0, itemId: 'item-1', price: 10.8, quantity: 1.5, tic: 0 },
            { index: 1, itemId: 'item-2', price: 25.0, quantity: 2.0, tic: 0 },
          ],
        },
      ],
    });

    const calculated = cart.items?.[0];
    if (!calculated) {
      throw new Error('No cart was returned');
    }

    console.log('Cart calculated successfully!');
    console.log('Cart ID:', calculated.cartId);
    console.log(
      'Total tax:',
      (calculated.lineItems ?? []).reduce((sum, item) => sum + item.tax.amount, 0).toFixed(2)
    );
    console.log('---\n');

    // Only a TaxCloud-connected merchant has a stored cart to convert. A
    // self-managed calculation is stateless, so stop here for those.
    if (!isTaxCloudCartResponse(cart)) {
      console.log('Self-managed calculation is stateless; nothing further to record.');
      return;
    }
    console.log('Connection ID:', cart.connectionId);
    console.log('---\n');

    // Step 2: record the cart as an order
    console.log('2. Creating an order from the cart...');
    const orderId = `example-order-${Date.now()}`;
    const order = await client.createOrderFromCart({
      merchantId,
      cartId: calculated.cartId,
      orderId,
      completedDate: new Date().toISOString(),
    });

    console.log('Order created successfully!');
    console.log('Order ID:', order.orderId);
    console.log('Kind:', order.kind);
    console.log('---\n');

    // Step 3: retrieve it
    console.log('3. Retrieving the order...');
    const retrieved = await client.getOrder({ merchantId, orderId });
    console.log('Completed Date:', retrieved.completedDate);
    console.log('Exclude From Filing:', retrieved.excludeFromFiling);
    console.log('---\n');

    // Step 4: update the completed date
    console.log('4. Updating the completed date...');
    const updated = await client.updateOrder({
      merchantId,
      orderId,
      completedDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    console.log('New Completed Date:', updated.completedDate);
    console.log('---\n');

    // Step 5: refund part of the order.
    // Never retry a refund blindly: a duplicate refund is a financial incident.
    console.log('5. Creating a partial refund...');
    const refund = await client.refundOrder({
      merchantId,
      orderId,
      items: [{ itemId: 'item-1', quantity: 1.0 }],
    });

    console.log('Refund created successfully!');
    console.log('Created Date:', refund.createdDate);
    console.log('Items refunded:', refund.items?.length ?? 0);
    console.log(
      'Total tax refunded:',
      (refund.items ?? []).reduce((sum, item) => sum + (item.tax?.amount ?? 0), 0).toFixed(2)
    );
    console.log('---\n');

    // Step 6: read the order back with its refunds attached
    console.log('6. Retrieving the order with refunds expanded...');
    const withRefunds = await client.getOrder({ merchantId, orderId, expand: 'refunds' });
    console.log('Refunds on order:', withRefunds.refunds?.length ?? 0);
    console.log('---\n');

    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    if (error instanceof Error && 'statusCode' in error) {
      console.error('Status Code:', (error as { statusCode?: number }).statusCode);
    }
  }
}

main();
