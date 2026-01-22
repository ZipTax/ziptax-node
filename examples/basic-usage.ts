/**
 * Basic usage example for ZipTax SDK
 *
 * Usage:
 *   ZIPTAX_API_KEY=your-api-key npm run example:basic
 */

import { ZiptaxClient } from '../src';

async function main() {
  // Initialize the client with your API key from environment variable
  const apiKey = process.env.ZIPTAX_API_KEY || 'your-api-key-here';

  if (apiKey === 'your-api-key-here') {
    console.error('Error: Please set ZIPTAX_API_KEY environment variable');
    console.error('Usage: ZIPTAX_API_KEY=your-api-key npm run example:basic');
    process.exit(1);
  }

  const client = new ZiptaxClient({
    apiKey,
  });

  try {
    // Get sales tax by address
    const taxByAddress = await client.getSalesTaxByAddress({
      address: '200 Spectrum Center Drive, Irvine, CA 92618',
    });

    console.log('Tax Rate by Address:');
    console.log('Total Rate:', taxByAddress.taxSummaries?.[0]?.rate);
    console.log('Base Rates:', taxByAddress.baseRates);
    console.log('---');

    // Get sales tax by geolocation
    const taxByGeo = await client.getSalesTaxByGeoLocation({
      lat: '33.65253',
      lng: '-117.74794',
    });

    console.log('Tax Rate by Geolocation:');
    console.log('Total Rate:', taxByGeo.taxSummaries?.[0]?.rate);
    console.log('Address:', taxByGeo.addressDetail.normalizedAddress);
    console.log('---');

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
