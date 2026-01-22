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
        'User-Agent': 'ziptax-node/1.0.0',
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
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * Make a POST request
   */
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * Make a request with retry logic
   */
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    const makeRequest = async (): Promise<T> => {
      try {
        const response: AxiosResponse<T> = await this.axiosInstance.request(config);
        return response.data;
      } catch (error) {
        throw this.handleError(error);
      }
    };

    return retryWithBackoff(makeRequest, this.retryOptions);
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

    // Authentication errors
    if (status === 401 || status === 403) {
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
   * Extract error message from response data
   */
  private extractErrorMessage(data: unknown): string | undefined {
    if (typeof data === 'string') {
      return data;
    }
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if ('message' in obj && typeof obj.message === 'string') {
        return obj.message;
      }
      if ('error' in obj && typeof obj.error === 'string') {
        return obj.error;
      }
    }
    return undefined;
  }
}
