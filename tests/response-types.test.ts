/**
 * Type-level regression guards for the v6.0 response models.
 *
 * The published OpenAPI enums describe only the `countryCode=USA` path. The
 * Canadian path is served by different handlers that report different
 * jurisdiction and tax types and omit two objects entirely, so narrowing these
 * fields to the documented US enums would reject real responses. These tests
 * fail to compile if that narrowing comes back.
 */

import {
  V60Response,
  V60BaseRate,
  V60TaxSummary,
  V60Shipping,
  V60Service,
  V60PostalCodeResult,
  V60Taxability,
} from '../src/models';

describe('V60 response types', () => {
  describe('USA responses', () => {
    it('accepts a US baseRate jurisdiction type', () => {
      const rate: V60BaseRate = {
        rate: 0.06,
        jurType: 'US_STATE_SALES_TAX',
        jurName: 'CA',
        jurDescription: 'US State Sales Tax',
        jurTaxCode: '06',
      };
      expect(rate.jurType).toBe('US_STATE_SALES_TAX');
    });

    it('accepts SALES_TAX and USE_TAX summaries', () => {
      const sales: V60TaxSummary = {
        rate: 0.0775,
        taxType: 'SALES_TAX',
        summaryName: 'Total Base Sales Tax',
        displayRates: [{ name: 'Total Rate', rate: 0.0775 }],
      };
      const use: V60TaxSummary = { ...sales, taxType: 'USE_TAX' };
      expect([sales.taxType, use.taxType]).toEqual(['SALES_TAX', 'USE_TAX']);
    });
  });

  describe('Canadian responses', () => {
    it('accepts GST and PST as baseRate jurisdiction types', () => {
      const gst: V60BaseRate = {
        rate: 0.05,
        jurType: 'GST',
        jurName: 'Ontario',
        jurDescription: 'Goods and Services Tax',
        jurTaxCode: 'ON',
      };
      const pst: V60BaseRate = { ...gst, jurType: 'PST', rate: 0.08 };

      expect([gst.jurType, pst.jurType]).toEqual(['GST', 'PST']);
    });

    it("accepts 'Sales' as a tax type, which the Canadian path returns", () => {
      const summary: V60TaxSummary = {
        rate: 0.13,
        taxType: 'Sales',
        summaryName: 'Total Tax',
        displayRates: [{ name: 'HST', rate: 0.13 }],
      };
      expect(summary.taxType).toBe('Sales');
    });

    it('accepts a full Canadian response with no service or sourcingRules', () => {
      // The Canadian handler's response struct has no service and no
      // sourcingRules fields, so both are absent from the JSON.
      const response: V60Response = {
        metadata: {
          version: 'v60',
          response: {
            code: 100,
            name: 'RESPONSE_CODE_SUCCESS',
            message: 'Successful API Request.',
            definition: 'https://api.zip-tax.com/request/v60/schema',
          },
        },
        baseRates: [
          {
            rate: 0.05,
            jurType: 'GST',
            jurName: 'Ontario',
            jurDescription: 'Goods and Services Tax',
            jurTaxCode: 'ON',
          },
        ],
        shipping: {
          adjustmentType: 'FREIGHT_TAXABLE',
          taxable: 'Y',
          description: 'Freight taxable',
        },
        taxSummaries: [
          {
            rate: 0.13,
            taxType: 'Sales',
            summaryName: 'Total Tax',
            displayRates: [{ name: 'HST', rate: 0.13 }],
          },
        ],
        addressDetail: {
          normalizedAddress: '100 Queen St W, Toronto, ON',
          incorporated: 'true',
          geoLat: 43.6534817,
          geoLng: -79.3839347,
        },
      };

      expect(response.service).toBeUndefined();
      expect(response.sourcingRules).toBeUndefined();
      expect(response.baseRates?.[0].jurType).toBe('GST');
    });
  });

  describe('unknown jurisdiction types remain representable', () => {
    it('accepts a jurisdiction type the SDK does not enumerate', () => {
      // The API can add jurisdiction types without an SDK release. A closed
      // union would make a valid response unassignable.
      const rate: V60BaseRate = {
        rate: 0.05,
        jurType: 'CAN_PROVINCE_QST',
        jurName: 'Quebec',
        jurDescription: 'Quebec Sales Tax',
        jurTaxCode: 'QC',
      };
      expect(rate.jurType).toBe('CAN_PROVINCE_QST');
    });

    it('narrows a known jurisdiction type in a switch', () => {
      const rate: V60BaseRate = {
        rate: 0.06,
        jurType: 'US_STATE_SALES_TAX',
        jurName: 'CA',
        jurDescription: 'US State Sales Tax',
        jurTaxCode: '06',
      };

      let level: string;
      switch (rate.jurType) {
        case 'US_STATE_SALES_TAX':
        case 'US_STATE_USE_TAX':
          level = 'state';
          break;
        case 'GST':
        case 'PST':
          level = 'canada';
          break;
        default:
          level = 'other';
      }

      expect(level).toBe('state');
    });
  });

  describe("taxability includes 'L'", () => {
    it("accepts 'L' on service taxability", () => {
      const service: V60Service = {
        adjustmentType: 'SERVICE_TAXABLE',
        taxable: 'L',
        description: 'Labor portion of Services taxable when separately stated',
      };
      expect(service.taxable).toBe('L');
    });

    it("accepts 'L' on shipping taxability, which mirrors the freight column", () => {
      // shipping.taxable is assigned raw from the same tax-table column family
      // as service.taxable, so it carries the same Y/N/L vocabulary.
      const shipping: V60Shipping = {
        adjustmentType: 'FREIGHT_TAXABLE',
        taxable: 'L',
        description: 'Freight non-taxable',
      };
      expect(shipping.taxable).toBe('L');
    });

    it("accepts 'L' on the postal-code result taxability flags", () => {
      const flags: Pick<V60PostalCodeResult, 'txbService' | 'txbFreight'> = {
        txbService: 'L',
        txbFreight: 'L',
      };
      expect([flags.txbService, flags.txbFreight]).toEqual(['L', 'L']);
    });

    it('shares one taxability type across service, shipping, and postal results', () => {
      const values: V60Taxability[] = ['Y', 'N', 'L'];
      expect(values).toHaveLength(3);
    });
  });
});
