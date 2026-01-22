/**
 * Tests for HTTPClient
 */

import axios from 'axios';
import { HTTPClient } from '../src/utils/http';
import {
  ZiptaxAPIError,
  ZiptaxAuthenticationError,
  ZiptaxNetworkError,
  ZiptaxRateLimitError,
} from '../src/exceptions';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HTTPClient', () => {
  let httpClient: HTTPClient;
  const mockAxiosInstance = {
    request: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    httpClient = new HTTPClient({
      baseURL: 'https://api.zip-tax.com',
      apiKey: 'test-api-key',
    });
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.zip-tax.com',
        timeout: 30000,
        headers: {
          'X-API-Key': 'test-api-key',
          'Content-Type': 'application/json',
          'User-Agent': 'ziptax-node/1.0.0',
        },
      });
    });

    it('should use custom timeout if provided', () => {
      new HTTPClient({
        baseURL: 'https://api.zip-tax.com',
        apiKey: 'test-api-key',
        timeout: 5000,
      });

      expect(mockedAxios.create).toHaveBeenCalledWith(expect.objectContaining({ timeout: 5000 }));
    });
  });

  describe('get', () => {
    it('should make GET request and return data', async () => {
      const mockData = { test: 'data' };
      mockAxiosInstance.request.mockResolvedValue({ data: mockData });

      const result = await httpClient.get('/test');

      expect(result).toEqual(mockData);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/test',
      });
    });

    it('should pass query parameters', async () => {
      const mockData = { test: 'data' };
      mockAxiosInstance.request.mockResolvedValue({ data: mockData });

      await httpClient.get('/test', { params: { key: 'value' } });

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/test',
        params: { key: 'value' },
      });
    });
  });

  describe('post', () => {
    it('should make POST request and return data', async () => {
      const mockData = { result: 'success' };
      const postData = { key: 'value' };
      mockAxiosInstance.request.mockResolvedValue({ data: mockData });

      const result = await httpClient.post('/test', postData);

      expect(result).toEqual(mockData);
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/test',
        data: postData,
      });
    });
  });

  describe('error handling', () => {
    it('should throw ZiptaxAuthenticationError for 401', async () => {
      mockAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        response: { status: 401, data: { message: 'Unauthorized' } },
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(httpClient.get('/test')).rejects.toThrow(ZiptaxAuthenticationError);
    });

    it('should throw ZiptaxAuthenticationError for 403', async () => {
      mockAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        response: { status: 403, data: { message: 'Forbidden' } },
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(httpClient.get('/test')).rejects.toThrow(ZiptaxAuthenticationError);
    });

    it('should throw ZiptaxRateLimitError for 429', async () => {
      mockAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' },
          headers: { 'retry-after': '60' },
        },
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(httpClient.get('/test')).rejects.toThrow(ZiptaxRateLimitError);
    });

    it('should throw ZiptaxRateLimitError without retry-after header', async () => {
      mockAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 429,
          data: { message: 'Rate limit exceeded' },
          headers: {},
        },
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      const error = (await httpClient.get('/test').catch((e) => e)) as ZiptaxRateLimitError;
      expect(error).toBeInstanceOf(ZiptaxRateLimitError);
      expect(error.retryAfter).toBeUndefined();
    });

    it('should throw ZiptaxNetworkError for network failures', async () => {
      mockAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        message: 'Network Error',
        response: undefined,
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(httpClient.get('/test')).rejects.toThrow(ZiptaxNetworkError);
    });

    it('should throw ZiptaxAPIError for other HTTP errors', async () => {
      mockAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        response: { status: 500, data: { message: 'Internal Server Error' } },
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      await expect(httpClient.get('/test')).rejects.toThrow(ZiptaxAPIError);
    });

    it('should extract error message from string data', async () => {
      mockAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        response: { status: 400, data: 'Bad Request Error' },
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      const error = (await httpClient.get('/test').catch((e) => e)) as ZiptaxAPIError;
      expect(error.message).toBe('Bad Request Error');
    });

    it('should extract error message from error field', async () => {
      mockAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        response: { status: 400, data: { error: 'Invalid parameters' } },
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      const error = (await httpClient.get('/test').catch((e) => e)) as ZiptaxAPIError;
      expect(error.message).toBe('Invalid parameters');
    });

    it('should use default message when no error message in response', async () => {
      mockAxiosInstance.request.mockRejectedValue({
        isAxiosError: true,
        response: { status: 400, data: {} },
      });
      mockedAxios.isAxiosError.mockReturnValue(true);

      const error = (await httpClient.get('/test').catch((e) => e)) as ZiptaxAPIError;
      expect(error.message).toBe('API request failed with status 400');
    });

    it('should handle non-axios errors', async () => {
      const customError = new Error('Custom error');
      mockAxiosInstance.request.mockRejectedValue(customError);
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(httpClient.get('/test')).rejects.toThrow('Custom error');
    });

    it('should handle non-error objects', async () => {
      mockAxiosInstance.request.mockRejectedValue('string error');
      mockedAxios.isAxiosError.mockReturnValue(false);

      await expect(httpClient.get('/test')).rejects.toThrow('string error');
    });
  });
});
