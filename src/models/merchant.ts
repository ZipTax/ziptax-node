/**
 * Merchant Management models.
 *
 * Merchant Management is a Private Preview feature. Contact support@zip.tax
 * for access. Request and response shapes may change before general
 * availability.
 *
 * @experimental
 */

/**
 * A merchant's compliance model, chosen once at creation time.
 *
 * - `taxcloud` (default): starts the TaxCloud invite process. TaxCloud handles
 *   registration, filing, and remittance in the merchant's own account.
 * - `self-managed`: active immediately, no invite. The merchant stays
 *   responsible for their own compliance.
 */
export type MerchantType = 'taxcloud' | 'self-managed' | 'connected' | 'offline';

/**
 * Derived merchant lifecycle status returned on reads.
 *
 * `merchant_type` is not returned by get or list; `status` is how you tell the
 * two compliance models apart. A self-managed merchant always reports
 * `external_compliance`.
 */
export type MerchantStatus =
  | 'taxcloud_invited'
  | 'taxcloud_connected'
  | 'taxcloud_disconnected'
  | 'external_compliance';

/**
 * Request to create a merchant
 *
 * @experimental Private Preview
 */
export interface CreateMerchantRequest {
  /** Legal or trading name of the merchant business (1-255 characters) */
  merchantName: string;
  /** First name of the merchant's primary contact */
  contactFirst?: string;
  /** Last name of the merchant's primary contact */
  contactLast?: string;
  /** Email of the primary contact; used for TaxCloud invitations */
  contactEmail?: string;
  /**
   * Send an invite to set up and connect a TaxCloud account.
   * Ignored when `merchant_type` is `self-managed`.
   */
  sendTaxcloudInvite?: boolean | null;
  /** The ID you use in your own system to identify this merchant */
  referenceId?: string;
  /** The merchant's compliance model (default: `taxcloud`) */
  merchant_type?: MerchantType;
}

/**
 * Shared envelope returned by merchant write operations
 */
export interface MerchantMutationResponse {
  /** Result status of the operation (e.g. 'success') */
  status: string;
  /** Human-readable description of the result */
  message: string;
  /** UUID of the merchant the operation applied to */
  merchantId: string;
}

/**
 * Response from creating a merchant
 *
 * @experimental Private Preview
 */
export type CreateMerchantResponse = MerchantMutationResponse;

/**
 * New field values for a merchant
 *
 * @experimental Private Preview
 */
export interface MerchantUpdate {
  /** New legal or trading name of the merchant business (1-255 characters) */
  merchantName: string;
  /** Updated first name of the merchant's primary contact */
  contactFirst?: string;
  /** Updated last name of the merchant's primary contact */
  contactLast?: string;
  /** Updated email address of the merchant's primary contact */
  contactEmail?: string;
  /** The ID you use in your own system to identify this merchant */
  referenceId?: string;
}

/**
 * Request to update a merchant
 *
 * @experimental Private Preview
 */
export interface UpdateMerchantRequest {
  /** UUID of the merchant to update */
  merchantId: string;
  /** New field values for the merchant */
  update: MerchantUpdate;
}

/**
 * Response from updating a merchant
 *
 * @experimental Private Preview
 */
export type UpdateMerchantResponse = MerchantMutationResponse;

/**
 * Response from deleting (soft-deleting) a merchant
 *
 * @experimental Private Preview
 */
export type DeleteMerchantResponse = MerchantMutationResponse;

/**
 * A merchant record as returned by get and list
 *
 * @experimental Private Preview
 */
export interface Merchant {
  /** UUID of the merchant */
  merchantId: string;
  /** Legal or trading name of the merchant business */
  merchantName: string;
  /** First name of the merchant's primary contact */
  contactFirst?: string;
  /** Last name of the merchant's primary contact */
  contactLast?: string;
  /** Email address of the merchant's primary contact */
  contactEmail?: string;
  /** The ID you use in your own system to identify this merchant */
  referenceId?: string;
  /** Derived TaxCloud lifecycle status */
  status: MerchantStatus;
}

/**
 * Response from retrieving a single merchant
 *
 * @experimental Private Preview
 */
export type GetMerchantResponse = Merchant;

/**
 * Response from listing merchants
 *
 * @experimental Private Preview
 */
export type ListMerchantsResponse = Merchant[];

/**
 * Request to set a merchant's TaxCloud compliance credentials.
 *
 * Credentials are stored encrypted at rest and resolved server-side on every
 * Merchant Transactions call, so they are never sent again after this call.
 *
 * @experimental Private Preview
 */
export interface SetMerchantCredentialsRequest {
  /** UUID of the merchant whose credentials are being set */
  merchantId: string;
  /** TaxCloud API key to associate with the merchant */
  apiKey: string;
  /** TaxCloud connection ID that pairs with the API key */
  connectionId: string;
}

/**
 * Response from setting merchant credentials
 *
 * @experimental Private Preview
 */
export type SetMerchantCredentialsResponse = MerchantMutationResponse;

/**
 * Response from deleting merchant credentials
 *
 * @experimental Private Preview
 */
export type DeleteMerchantCredentialsResponse = MerchantMutationResponse;
