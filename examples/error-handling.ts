/**
 * Error handling example for ZipTax SDK
 *
 * Usage:
 *   ZIPTAX_API_KEY=your-api-key npm run example:errors
 */

import {
  ZiptaxClient,
  ZiptaxError,
  ZiptaxAPIError,
  ZiptaxAuthenticationError,
  ZiptaxValidationError,
  ZiptaxNetworkError,
  ZiptaxRateLimitError,
} from '../src';

async function main() {
  // Initialize the client with your API key from environment variable
  const apiKey = process.env.ZIPTAX_API_KEY || 'your-api-key-here';

  if (apiKey === 'your-api-key-here') {
    console.error('Error: Please set ZIPTAX_API_KEY environment variable');
    console.error('Usage: ZIPTAX_API_KEY=your-api-key npm run example:errors');
    process.exit(1);
  }

  const client = new ZiptaxClient({
    apiKey,
    // Enable retry logic for transient failures
    retryOptions: {
      maxAttempts: 3,
      initialDelay: 1000,
    },
  });

  // Example 1: Handling validation errors
  try {
    await client.getSalesTaxByAddress({
      address: '', // Empty address will trigger validation error
    });
  } catch (error) {
    if (error instanceof ZiptaxValidationError) {
      console.error('Validation Error:', error.message);
      console.error('Validation Details:', error.errors);
    }
  }

  // Example 2: Handling authentication errors
  try {
    const invalidClient = new ZiptaxClient({
      apiKey: 'invalid-key',
    });
    await invalidClient.getSalesTaxByAddress({
      address: '200 Spectrum Center Drive',
    });
  } catch (error) {
    if (error instanceof ZiptaxAuthenticationError) {
      console.error('Authentication Error:', error.message);
      console.error('Please check your API key');
    }
  }

  // Example 3: Handling rate limit errors
  try {
    await client.getSalesTaxByAddress({
      address: '200 Spectrum Center Drive',
    });
  } catch (error) {
    if (error instanceof ZiptaxRateLimitError) {
      console.error('Rate Limit Error:', error.message);
      if (error.retryAfter) {
        console.error(`Retry after ${error.retryAfter} seconds`);
      }
    }
  }

  // Example 4: Handling network errors
  try {
    await client.getSalesTaxByAddress({
      address: '200 Spectrum Center Drive',
    });
  } catch (error) {
    if (error instanceof ZiptaxNetworkError) {
      console.error('Network Error:', error.message);
      console.error('Please check your internet connection');
    }
  }

  // Example 5: Handling API errors
  try {
    await client.getSalesTaxByAddress({
      address: '200 Spectrum Center Drive',
    });
  } catch (error) {
    if (error instanceof ZiptaxAPIError) {
      console.error('API Error:', error.message);
      console.error('Status Code:', error.statusCode);
      console.error('Response:', error.responseBody);
    }
  }

  // Example 6: Catch-all error handling
  try {
    await client.getSalesTaxByAddress({
      address: '200 Spectrum Center Drive',
    });
  } catch (error) {
    if (error instanceof ZiptaxError) {
      // All ZipTax errors inherit from ZiptaxError
      console.error('ZipTax Error:', error.name, '-', error.message);
    } else {
      // Unexpected error
      console.error('Unexpected Error:', error);
    }
  }

  // Example 7: Graceful degradation
  try {
    const result = await client.getSalesTaxByAddress({
      address: '200 Spectrum Center Drive',
    });
    console.log('Success:', result);
  } catch (error) {
    if (error instanceof ZiptaxError) {
      console.warn('Failed to fetch tax rate, using default');
      // Use a default or fallback value
      const defaultRate = 0.0;
      console.log('Using default rate:', defaultRate);
    } else {
      throw error; // Re-throw unexpected errors
    }
  }
}

main();
