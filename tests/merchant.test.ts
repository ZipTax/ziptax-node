/**
 * Tests for Merchant Management (create, update, get, list, delete, credentials)
 */

import { ZiptaxClient } from '../src/client';
import { ZiptaxValidationError } from '../src/exceptions';
import { HTTPClient } from '../src/utils/http';

jest.mock('../src/utils/http');

const MERCHANT_ID = '6b3c1f5e-2a8d-4c9b-9f2e-1d7a4b6c8e10';

const mockMutationResponse = {
  status: 'success',
  message: 'merchant created successfully',
  merchantId: MERCHANT_ID,
};

const mockMerchant = {
  merchantId: MERCHANT_ID,
  merchantName: 'Acme Outfitters',
  contactFirst: 'Jane',
  contactLast: 'Doe',
  contactEmail: 'jane@acmeoutfitters.com',
  status: 'external_compliance' as const,
  referenceId: 'acct-10482',
};

describe('Merchant Management', () => {
  let mockHttpClient: jest.Mocked<HTTPClient>;
  let client: ZiptaxClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHttpClient = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
    } as unknown as jest.Mocked<HTTPClient>;
    (HTTPClient as jest.MockedClass<typeof HTTPClient>).mockImplementation(() => mockHttpClient);
    client = new ZiptaxClient({ apiKey: 'test-api-key' });
  });

  describe('createMerchant', () => {
    it('should create a merchant', async () => {
      mockHttpClient.post.mockResolvedValue(mockMutationResponse);

      const result = await client.createMerchant({
        merchantName: 'Acme Outfitters',
        contactFirst: 'Jane',
        contactLast: 'Doe',
        contactEmail: 'jane@acmeoutfitters.com',
        referenceId: 'acct-10482',
        merchant_type: 'self-managed',
      });

      expect(result).toEqual(mockMutationResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/merchant/create', {
        merchantName: 'Acme Outfitters',
        contactFirst: 'Jane',
        contactLast: 'Doe',
        contactEmail: 'jane@acmeoutfitters.com',
        referenceId: 'acct-10482',
        merchant_type: 'self-managed',
      });
    });

    it('should create a merchant with only the required name', async () => {
      mockHttpClient.post.mockResolvedValue(mockMutationResponse);

      await client.createMerchant({ merchantName: 'Acme Outfitters' });

      expect(mockHttpClient.post).toHaveBeenCalledWith('/merchant/create', {
        merchantName: 'Acme Outfitters',
      });
    });

    it('should reject a missing merchant name', async () => {
      await expect(client.createMerchant({ merchantName: '' })).rejects.toThrow(
        ZiptaxValidationError
      );
    });

    it('should reject a merchant name over 255 characters', async () => {
      await expect(client.createMerchant({ merchantName: 'a'.repeat(256) })).rejects.toThrow(
        ZiptaxValidationError
      );
    });
  });

  describe('updateMerchant', () => {
    it('should update a merchant', async () => {
      mockHttpClient.post.mockResolvedValue(mockMutationResponse);

      const result = await client.updateMerchant({
        merchantId: MERCHANT_ID,
        update: { merchantName: 'Acme Outfitters LLC', referenceId: 'acct-10482' },
      });

      expect(result).toEqual(mockMutationResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/merchant/update', {
        merchantId: MERCHANT_ID,
        update: { merchantName: 'Acme Outfitters LLC', referenceId: 'acct-10482' },
      });
    });

    it('should reject a malformed merchantId', async () => {
      await expect(
        client.updateMerchant({
          merchantId: 'not-a-uuid',
          update: { merchantName: 'Acme' },
        })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a missing update object', async () => {
      await expect(
        client.updateMerchant({
          merchantId: MERCHANT_ID,
          update: undefined as unknown as { merchantName: string },
        })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a missing update.merchantName', async () => {
      await expect(
        client.updateMerchant({ merchantId: MERCHANT_ID, update: { merchantName: '' } })
      ).rejects.toThrow(ZiptaxValidationError);
    });
  });

  describe('getMerchant', () => {
    it('should retrieve a merchant', async () => {
      mockHttpClient.post.mockResolvedValue(mockMerchant);

      const result = await client.getMerchant(MERCHANT_ID);

      expect(result).toEqual(mockMerchant);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/merchant/get', {
        merchantId: MERCHANT_ID,
      });
    });

    it('should report a self-managed merchant as external_compliance', async () => {
      mockHttpClient.post.mockResolvedValue(mockMerchant);

      const result = await client.getMerchant(MERCHANT_ID);

      expect(result.status).toBe('external_compliance');
    });

    it('should reject a malformed merchantId', async () => {
      await expect(client.getMerchant('12345')).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject an empty merchantId', async () => {
      await expect(client.getMerchant('')).rejects.toThrow(ZiptaxValidationError);
    });
  });

  describe('listMerchants', () => {
    it('should list merchants', async () => {
      mockHttpClient.get.mockResolvedValue([mockMerchant]);

      const result = await client.listMerchants();

      expect(result).toEqual([mockMerchant]);
      expect(mockHttpClient.get).toHaveBeenCalledWith('/merchant/list');
    });
  });

  describe('deleteMerchant', () => {
    it('should soft-delete a merchant', async () => {
      mockHttpClient.post.mockResolvedValue(mockMutationResponse);

      const result = await client.deleteMerchant(MERCHANT_ID);

      expect(result).toEqual(mockMutationResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/merchant/delete', {
        merchantId: MERCHANT_ID,
      });
    });

    it('should reject a malformed merchantId', async () => {
      await expect(client.deleteMerchant('nope')).rejects.toThrow(ZiptaxValidationError);
    });
  });

  describe('setMerchantCredentials', () => {
    it('should store merchant credentials', async () => {
      mockHttpClient.post.mockResolvedValue(mockMutationResponse);

      const result = await client.setMerchantCredentials({
        merchantId: MERCHANT_ID,
        apiKey: 'tc-key',
        connectionId: 'tc-connection',
      });

      expect(result).toEqual(mockMutationResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/merchant/credentials/set', {
        merchantId: MERCHANT_ID,
        apiKey: 'tc-key',
        connectionId: 'tc-connection',
      });
    });

    it('should reject a missing apiKey', async () => {
      await expect(
        client.setMerchantCredentials({
          merchantId: MERCHANT_ID,
          apiKey: '',
          connectionId: 'tc-connection',
        })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a missing connectionId', async () => {
      await expect(
        client.setMerchantCredentials({
          merchantId: MERCHANT_ID,
          apiKey: 'tc-key',
          connectionId: '',
        })
      ).rejects.toThrow(ZiptaxValidationError);
    });

    it('should reject a malformed merchantId', async () => {
      await expect(
        client.setMerchantCredentials({
          merchantId: 'bad',
          apiKey: 'tc-key',
          connectionId: 'tc-connection',
        })
      ).rejects.toThrow(ZiptaxValidationError);
    });
  });

  describe('deleteMerchantCredentials', () => {
    it('should remove merchant credentials', async () => {
      mockHttpClient.post.mockResolvedValue(mockMutationResponse);

      const result = await client.deleteMerchantCredentials(MERCHANT_ID);

      expect(result).toEqual(mockMutationResponse);
      expect(mockHttpClient.post).toHaveBeenCalledWith('/merchant/credentials/delete', {
        merchantId: MERCHANT_ID,
      });
    });

    it('should reject a malformed merchantId', async () => {
      await expect(client.deleteMerchantCredentials('bad')).rejects.toThrow(ZiptaxValidationError);
    });
  });
});
