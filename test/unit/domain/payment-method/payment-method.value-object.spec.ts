// @ts-nocheck
/* eslint-disable */
import {
  cardPaymentMethodSchema,
  nequiPaymentMethodSchema,
  psePaymentMethodSchema,
  bancolombiaTransferPaymentMethodSchema,
  bancolombiaQrPaymentMethodSchema,
  paymentMethodSchema,
} from '@domain/payment-method/payment-method.value-object';

describe('Payment method value object schemas', () => {
  describe('cardPaymentMethodSchema', () => {
    it('parses a valid CARD payload with explicit installments', () => {
      const result = cardPaymentMethodSchema.safeParse({
        type: 'CARD',
        token: 'tok-abc123',
        installments: 3,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('CARD');
        expect(result.data.token).toBe('tok-abc123');
        expect(result.data.installments).toBe(3);
      }
    });

    it('applies default installments of 1 when omitted', () => {
      const result = cardPaymentMethodSchema.safeParse({ type: 'CARD', token: 'tok-abc' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.installments).toBe(1);
    });

    it('rejects empty token', () => {
      const result = cardPaymentMethodSchema.safeParse({ type: 'CARD', token: '' });
      expect(result.success).toBe(false);
    });

    it('rejects installments less than 1', () => {
      const result = cardPaymentMethodSchema.safeParse({
        type: 'CARD',
        token: 'tok-abc',
        installments: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer installments', () => {
      const result = cardPaymentMethodSchema.safeParse({
        type: 'CARD',
        token: 'tok-abc',
        installments: 1.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('nequiPaymentMethodSchema', () => {
    it('parses a valid NEQUI payload', () => {
      const result = nequiPaymentMethodSchema.safeParse({
        type: 'NEQUI',
        phoneNumber: '3001234567',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('NEQUI');
        expect(result.data.phoneNumber).toBe('3001234567');
      }
    });

    it('rejects phone number shorter than 10 digits', () => {
      const result = nequiPaymentMethodSchema.safeParse({
        type: 'NEQUI',
        phoneNumber: '300123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects phone number longer than 10 digits', () => {
      const result = nequiPaymentMethodSchema.safeParse({
        type: 'NEQUI',
        phoneNumber: '30012345678',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('psePaymentMethodSchema', () => {
    const validPse = {
      type: 'PSE',
      userType: 0,
      userLegalIdType: 'CC',
      userLegalId: '123456789',
      financialInstitutionCode: 'NEQUI',
      paymentDescription: 'Payment for order',
    };

    it('parses a valid PSE payload', () => {
      const result = psePaymentMethodSchema.safeParse(validPse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('PSE');
        expect(result.data.userType).toBe(0);
      }
    });

    it('accepts userType of 1', () => {
      const result = psePaymentMethodSchema.safeParse({ ...validPse, userType: 1 });
      expect(result.success).toBe(true);
    });

    it('rejects userType greater than 1', () => {
      const result = psePaymentMethodSchema.safeParse({ ...validPse, userType: 2 });
      expect(result.success).toBe(false);
    });

    it('rejects userType less than 0', () => {
      const result = psePaymentMethodSchema.safeParse({ ...validPse, userType: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects empty userLegalIdType', () => {
      const result = psePaymentMethodSchema.safeParse({ ...validPse, userLegalIdType: '' });
      expect(result.success).toBe(false);
    });

    it('rejects empty userLegalId', () => {
      const result = psePaymentMethodSchema.safeParse({ ...validPse, userLegalId: '' });
      expect(result.success).toBe(false);
    });

    it('rejects empty financialInstitutionCode', () => {
      const result = psePaymentMethodSchema.safeParse({
        ...validPse,
        financialInstitutionCode: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty paymentDescription', () => {
      const result = psePaymentMethodSchema.safeParse({ ...validPse, paymentDescription: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('bancolombiaTransferPaymentMethodSchema', () => {
    it('parses a valid BANCOLOMBIA_TRANSFER payload', () => {
      const result = bancolombiaTransferPaymentMethodSchema.safeParse({
        type: 'BANCOLOMBIA_TRANSFER',
        userType: 0,
        paymentDescription: 'Payment for services',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('BANCOLOMBIA_TRANSFER');
        expect(result.data.userType).toBe(0);
      }
    });

    it('accepts userType of 1', () => {
      const result = bancolombiaTransferPaymentMethodSchema.safeParse({
        type: 'BANCOLOMBIA_TRANSFER',
        userType: 1,
        paymentDescription: 'desc',
      });
      expect(result.success).toBe(true);
    });

    it('rejects userType greater than 1', () => {
      const result = bancolombiaTransferPaymentMethodSchema.safeParse({
        type: 'BANCOLOMBIA_TRANSFER',
        userType: 2,
        paymentDescription: 'desc',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty paymentDescription', () => {
      const result = bancolombiaTransferPaymentMethodSchema.safeParse({
        type: 'BANCOLOMBIA_TRANSFER',
        userType: 0,
        paymentDescription: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing paymentDescription', () => {
      const result = bancolombiaTransferPaymentMethodSchema.safeParse({
        type: 'BANCOLOMBIA_TRANSFER',
        userType: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('bancolombiaQrPaymentMethodSchema', () => {
    it('parses a valid BANCOLOMBIA_QR payload', () => {
      const result = bancolombiaQrPaymentMethodSchema.safeParse({ type: 'BANCOLOMBIA_QR' });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.type).toBe('BANCOLOMBIA_QR');
    });

    it('rejects wrong type literal', () => {
      const result = bancolombiaQrPaymentMethodSchema.safeParse({ type: 'QR' });
      expect(result.success).toBe(false);
    });
  });

  describe('paymentMethodSchema (discriminated union)', () => {
    it('selects CARD variant', () => {
      const result = paymentMethodSchema.safeParse({ type: 'CARD', token: 'tok-abc' });
      expect(result.success).toBe(true);
    });

    it('selects NEQUI variant', () => {
      const result = paymentMethodSchema.safeParse({
        type: 'NEQUI',
        phoneNumber: '3001234567',
      });
      expect(result.success).toBe(true);
    });

    it('selects PSE variant', () => {
      const result = paymentMethodSchema.safeParse({
        type: 'PSE',
        userType: 0,
        userLegalIdType: 'CC',
        userLegalId: '12345',
        financialInstitutionCode: 'NEQUI',
        paymentDescription: 'desc',
      });
      expect(result.success).toBe(true);
    });

    it('selects BANCOLOMBIA_TRANSFER variant', () => {
      const result = paymentMethodSchema.safeParse({
        type: 'BANCOLOMBIA_TRANSFER',
        userType: 0,
        paymentDescription: 'desc',
      });
      expect(result.success).toBe(true);
    });

    it('selects BANCOLOMBIA_QR variant', () => {
      const result = paymentMethodSchema.safeParse({ type: 'BANCOLOMBIA_QR' });
      expect(result.success).toBe(true);
    });

    it('rejects an unknown type', () => {
      const result = paymentMethodSchema.safeParse({ type: 'UNKNOWN' });
      expect(result.success).toBe(false);
    });

    it('rejects missing type', () => {
      const result = paymentMethodSchema.safeParse({ token: 'tok-abc' });
      expect(result.success).toBe(false);
    });
  });
});
