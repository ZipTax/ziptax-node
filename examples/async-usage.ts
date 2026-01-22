/**
 * Async operations example for ZipTax SDK
 *
 * Usage:
 *   ZIPTAX_API_KEY=your-api-key npm run example:async
 */

import { ZiptaxClient } from '../src';

async function main() {
  // Initialize the client with your API key from environment variable
  const apiKey = process.env.ZIPTAX_API_KEY || 'your-api-key-here';

  if (apiKey === 'your-api-key-here') {
    console.error('Error: Please set ZIPTAX_API_KEY environment variable');
    console.error('Usage: ZIPTAX_API_KEY=your-api-key npm run example:async');
    process.exit(1);
  }

  const client = new ZiptaxClient({
    apiKey,
  });

  // Example: Fetch tax rates for multiple addresses concurrently
  const addresses = [
    '200 Spectrum Center Drive, Irvine, CA 92618',
    '1600 Amphitheatre Parkway, Mountain View, CA 94043',
    '350 Fifth Avenue, New York, NY 10118',
  ];

  try {
    console.log('Fetching tax rates for multiple addresses...');

    // Run requests in parallel
    const results = await Promise.all(
      addresses.map((address) => client.getSalesTaxByAddress({ address }))
    );

    // Process results
    results.forEach((result, index) => {
      console.log(`\nAddress ${index + 1}: ${addresses[index]}`);
      console.log('Normalized:', result.addressDetail.normalizedAddress);
      console.log('Total Rate:', result.taxSummaries?.[0]?.rate || 'N/A');
      console.log('Jurisdiction:', result.baseRates?.[0]?.jurName || 'N/A');
    });

    // Example: Fetch with different country codes
    console.log('\n\nFetching tax rates for different countries...');

    const [usaRate, canadaRate] = await Promise.all([
      client.getSalesTaxByAddress({
        address: '1600 Amphitheatre Parkway, Mountain View, CA',
        countryCode: 'USA',
      }),
      client.getSalesTaxByAddress({
        address: '301 Front St W, Toronto, ON',
        countryCode: 'CAN',
      }),
    ]);

    console.log('USA Rate:', usaRate.taxSummaries?.[0]?.rate);
    console.log('Canada Rate:', canadaRate.taxSummaries?.[0]?.rate);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
