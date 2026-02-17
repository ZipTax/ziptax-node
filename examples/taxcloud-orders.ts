/**
 * TaxCloud order management example for ZipTax SDK
 *
 * Usage:
 *   ZIPTAX_API_KEY=your-api-key \
 *   TAXCLOUD_CONNECTION_ID=your-connection-id \
 *   TAXCLOUD_API_KEY=your-taxcloud-key \
 *   npm run example:taxcloud
 */

import { ZiptaxClient } from '../src';

async function main() {
  // Get credentials from environment variables
  const apiKey = process.env.ZIPTAX_API_KEY || 'your-api-key-here';
  const taxCloudConnectionId = process.env.TAXCLOUD_CONNECTION_ID || '';
  const taxCloudAPIKey = process.env.TAXCLOUD_API_KEY || '';

  if (apiKey === 'your-api-key-here' || !taxCloudConnectionId || !taxCloudAPIKey) {
    console.error('Error: Please set required environment variables');
    console.error('Usage:');
    console.error('  ZIPTAX_API_KEY=your-api-key \\');
    console.error('  TAXCLOUD_CONNECTION_ID=your-connection-id \\');
    console.error('  TAXCLOUD_API_KEY=your-taxcloud-key \\');
    console.error('  npm run example:taxcloud');
    process.exit(1);
  }

  // Initialize the client with TaxCloud credentials
  const client = new ZiptaxClient({
    apiKey,
    taxCloudConnectionId,
    taxCloudAPIKey,
    enableLogging: true,
  });

  console.log('ZipTax SDK with TaxCloud Integration Example');
  console.log('==============================================\n');

  try {
    // Example 1: Create a new order
    console.log('1. Creating a new order...');
    const orderId = `example-order-${Date.now()}`;

    const orderResponse = await client.createOrder({
      orderId,
      customerId: 'customer-123',
      transactionDate: new Date().toISOString(),
      completedDate: new Date().toISOString(),
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
        {
          index: 1,
          itemId: 'item-2',
          price: 25.0,
          quantity: 2.0,
          tax: { amount: 4.07, rate: 0.0813 },
          tic: 0,
        },
      ],
      currency: { currencyCode: 'USD' },
    });

    console.log('Order created successfully!');
    console.log('Order ID:', orderResponse.orderId);
    console.log('Customer ID:', orderResponse.customerId);
    console.log('Transaction Date:', orderResponse.transactionDate);
    console.log('Line Items:', orderResponse.lineItems.length);
    console.log(
      'Total Tax:',
      orderResponse.lineItems.reduce((sum, item) => sum + item.tax.amount, 0).toFixed(2)
    );
    console.log('---\n');

    // Example 2: Retrieve the order
    console.log('2. Retrieving the order...');
    const retrievedOrder = await client.getOrder(orderId);

    console.log('Order retrieved successfully!');
    console.log('Order ID:', retrievedOrder.orderId);
    console.log('Completed Date:', retrievedOrder.completedDate);
    console.log('Exclude From Filing:', retrievedOrder.excludeFromFiling);
    console.log('---\n');

    // Example 3: Update the order's completed date
    console.log('3. Updating order completed date...');
    const newCompletedDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow

    const updatedOrder = await client.updateOrder(orderId, {
      completedDate: newCompletedDate,
    });

    console.log('Order updated successfully!');
    console.log('New Completed Date:', updatedOrder.completedDate);
    console.log('---\n');

    // Example 4: Partial refund (refund one item)
    console.log('4. Creating a partial refund...');
    const partialRefunds = await client.refundOrder(orderId, {
      items: [
        {
          itemId: 'item-1',
          quantity: 1.0,
        },
      ],
    });

    console.log('Partial refund created successfully!');
    console.log('Number of refund transactions:', partialRefunds.length);
    partialRefunds.forEach((refund, index) => {
      console.log(`Refund ${index + 1}:`);
      console.log('  Created Date:', refund.createdDate);
      console.log('  Items refunded:', refund.items.length);
      console.log(
        '  Total tax refunded:',
        refund.items.reduce((sum, item) => sum + item.tax.amount, 0).toFixed(2)
      );
    });
    console.log('---\n');

    // Example 5: Demonstrate error handling
    console.log('5. Demonstrating error handling...');
    try {
      await client.getOrder('non-existent-order-id');
    } catch (error) {
      console.log('Expected error caught:', error instanceof Error ? error.message : error);
    }
    console.log('---\n');

    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      if ('statusCode' in error) {
        console.error('Status Code:', (error as any).statusCode);
      }
    }
  }
}

main();
