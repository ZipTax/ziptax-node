/**
 * HTTP client utility with retry logic
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import {
  ZiptaxAPIError,
  ZiptaxAuthenticationError,
  ZiptaxNetworkError,
  ZiptaxRateLimitError,
} from '../exceptions';
import { retryWithBackoff, RetryOptions } from './retry';
import { SDK_VERSION } from '../version';

export interface HTTPClientConfig {
  /** Base URL for API requests */
  baseURL: string;
  /** API key for authentication */
  apiKey: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Retry configuration */
  retryOptions?: RetryOptions;
  /** Enable request/response logging */
  enableLogging?: boolean;
}

/**
 * Axios config plus a per-request retry override.
 *
 * The override is merged over the client's `retryOptions`, so a single endpoint
 * can opt out of retrying without changing the policy for everything else. It is
 * stripped before the config reaches axios.
 */
export interface HTTPRequestOptions extends AxiosRequestConfig {
  /** Retry policy for this request only */
  retryOptions?: RetryOptions;
}

/**
 * HTTP client for making API requests
 */
export class HTTPClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly retryOptions: RetryOptions;
  private readonly enableLogging: boolean;

  constructor(config: HTTPClientConfig) {
    this.retryOptions = config.retryOptions || {};
    this.enableLogging = config.enableLogging || false;

    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
        'User-Agent': `ziptax-node/${SDK_VERSION}`,
      },
    });

    // Add request interceptor for logging
    if (this.enableLogging) {
      this.axiosInstance.interceptors.request.use((request) => {
        console.log('Request:', {
          method: request.method,
          url: request.url,
          params: request.params,
        });
        return request;
      });
    }

    // Add response interceptor for logging
    if (this.enableLogging) {
      this.axiosInstance.interceptors.response.use(
        (response) => {
          console.log('Response:', {
            status: response.status,
            data: response.data,
          });
          return response;
        },
        (error) => {
          console.error('Response Error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          });
          return Promise.reject(error);
        }
      );
    }
  }

  /**
   * Make a GET request
   */
  async get<T>(url: string, config?: HTTPRequestOptions): Promise<T> {
    const { retryOptions, ...axiosConfig } = config ?? {};
    return this.request<T>({ ...axiosConfig, method: 'GET', url }, retryOptions);
  }

  /**
   * Make a POST request
   */
  async post<T>(url: string, data?: unknown, config?: HTTPRequestOptions): Promise<T> {
    const { retryOptions, ...axiosConfig } = config ?? {};
    return this.request<T>({ ...axiosConfig, method: 'POST', url, data }, retryOptions);
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(url: string, data?: unknown, config?: HTTPRequestOptions): Promise<T> {
    const { retryOptions, ...axiosConfig } = config ?? {};
    return this.request<T>({ ...axiosConfig, method: 'PATCH', url, data }, retryOptions);
  }

  /**
   * Make a request with retry logic.
   *
   * @param config - Axios request config
   * @param retryOverride - Per-request retry policy, merged over the client's
   *   own. Non-idempotent writes pass `NO_RETRY` here so a request whose outcome
   *   is unknown is never silently re-sent.
   */
  private async request<T>(config: AxiosRequestConfig, retryOverride?: RetryOptions): Promise<T> {
    const makeRequest = async (): Promise<T> => {
      try {
        const response: AxiosResponse<T> = await this.axiosInstance.request(config);
        this.checkResponseBody(response.data);
        return response.data;
      } catch (error) {
        throw this.handleError(error);
      }
    };

    return retryWithBackoff(makeRequest, { ...this.retryOptions, ...retryOverride });
  }

  /**
   * Check response body for API-level errors (e.g., invalid key returns HTTP 200 with error code)
   */
  private checkResponseBody(data: unknown): void {
    if (typeof data !== 'object' || data === null) {
      return;
    }

    const body = data as Record<string, unknown>;

    // Check for V60 response metadata errors
    if (body.metadata && typeof body.metadata === 'object') {
      const metadata = body.metadata as Record<string, unknown>;
      if (metadata.response && typeof metadata.response === 'object') {
        const response = metadata.response as Record<string, unknown>;
        const code = response.code;
        if (typeof code === 'number' && code !== 100) {
          const message =
            typeof response.message === 'string' ? response.message : 'API request failed';
          // Code 101 = invalid key
          if (code === 101) {
            throw new ZiptaxAuthenticationError(message);
          }
          throw new ZiptaxAPIError(message, undefined, data);
        }
      }
    }
  }

  /**
   * Handle and transform axios errors into ZipTax errors
   */
  private handleError(error: unknown): Error {
    if (!axios.isAxiosError(error)) {
      return error instanceof Error ? error : new Error(String(error));
    }

    const axiosError = error as AxiosError;

    // Network errors (no response received)
    if (!axiosError.response) {
      return new ZiptaxNetworkError(axiosError.message || 'Network request failed', axiosError);
    }

    const { status, data } = axiosError.response;

    // Authentication errors. 403 is deliberately excluded: on the Merchant
    // endpoints it means the merchant is unknown, not owned by the account, or
    // the operation is unavailable for a self-managed merchant, none of which
    // are credential problems.
    if (status === 401) {
      return new ZiptaxAuthenticationError(
        this.extractErrorMessage(data) || 'Authentication failed'
      );
    }

    // Rate limit errors
    if (status === 429) {
      const retryAfter = axiosError.response.headers['retry-after'];
      return new ZiptaxRateLimitError(
        this.extractErrorMessage(data) || 'Rate limit exceeded',
        retryAfter ? parseInt(retryAfter, 10) : undefined
      );
    }

    // Generic API errors
    return new ZiptaxAPIError(
      this.extractErrorMessage(data) || `API request failed with status ${status}`,
      status,
      data
    );
  }

  /**
   * Extract an error message from response data.
   *
   * Covers the three envelopes the API can return: the Ziptax-level
   * `{ status, message }` shape, the operation-level
   * `{ status, title, detail, error }` shape used by the Merchant endpoints,
   * and RFC7807 `{ title, detail }` problem details.
   */
  private extractErrorMessage(data: unknown): string | undefined {
    if (typeof data === 'string') {
      return data || undefined;
    }
    if (typeof data !== 'object' || data === null) {
      return undefined;
    }

    const obj = data as Record<string, unknown>;

    if (typeof obj.message === 'string' && obj.message) {
      return obj.message;
    }
    if (typeof obj.detail === 'string' && obj.detail) {
      return obj.detail;
    }
    if (typeof obj.title === 'string' && obj.title) {
      return obj.title;
    }
    if (typeof obj.error === 'string' && obj.error) {
      return obj.error;
    }
    return undefined;
  }
}
