// @ts-nocheck
/* eslint-disable */
import {
  Transaction,
  transactionSchema,
  createTransactionSchema,
  updateTransactionSchema,
} from '@domain/transaction/transaction.entity';
import { InvalidAmountError } from '@domain/transaction/errors/invalid-amount.error';
import { InvalidPaymentMethodError } from '@domain/transaction/errors/invalid-payment-method.error';

const VALID_ID = '11111111-2222-4333-8444-555555555555';

const validInput = {
  id: VALID_ID,
  reference: 'order-ref-001',
  amountInCents: 10000,
  currency: 'COP',
  paymentMethod: 'CARD',
  customerEmail: 'customer@example.com',
  customerIp: '192.168.1.1',
  signature: 'sig-abc123',
};

describe('Transaction', () => {
  describe('create()', () => {
    it('creates a PENDING transaction with all valid inputs', () => {
      const result = Transaction.create(validInput);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(VALID_ID);
        expect(result.value.status).toBe('PENDING');
        expect(result.value.providerId).toBeNull();
        expect(result.value.providerResponse).toBeNull();
        expect(result.value.statusMessage).toBeNull();
      }
    });

    it('returns InvalidAmountError when amountInCents is zero', () => {
      const result = Transaction.create({ ...validInput, amountInCents: 0 });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBeInstanceOf(InvalidAmountError);
    });

    it('returns InvalidAmountError when amountInCents is negative', () => {
      const result = Transaction.create({ ...validInput, amountInCents: -1 });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBeInstanceOf(InvalidAmountError);
    });

    it('returns InvalidAmountError when amountInCents is a float', () => {
      const result = Transaction.create({ ...validInput, amountInCents: 99.5 });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBeInstanceOf(InvalidAmountError);
    });

    it('returns InvalidPaymentMethodError for an unsupported payment method', () => {
      const result = Transaction.create({ ...validInput, paymentMethod: 'UNKNOWN' });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBeInstanceOf(InvalidPaymentMethodError);
    });

    it('accepts all supported payment methods', () => {
      const methods = ['CARD', 'NEQUI', 'PSE', 'BANCOLOMBIA_TRANSFER', 'BANCOLOMBIA_QR'];
      for (const method of methods) {
        const result = Transaction.create({ ...validInput, paymentMethod: method });
        expect(result.ok).toBe(true);
      }
    });

    it('sets createdAt and updatedAt to current time', () => {
      const before = new Date();
      const result = Transaction.create(validInput);
      const after = new Date();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(result.value.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      }
    });
  });

  describe('fromPersistence()', () => {
    it('reconstructs a transaction from persisted data', () => {
      const now = new Date('2024-01-15T10:00:00.000Z');
      const tx = Transaction.fromPersistence({
        id: VALID_ID,
        providerId: 'prov-abc',
        reference: 'order-ref-001',
        amountInCents: 10000,
        currency: 'COP',
        status: 'APPROVED',
        statusMessage: 'Approved',
        paymentMethod: 'CARD',
        customerEmail: 'customer@example.com',
        customerIp: null,
        signature: 'sig-abc123',
        providerResponse: { id: 'prov-abc' },
        createdAt: now,
        updatedAt: now,
      });

      expect(tx.id).toBe(VALID_ID);
      expect(tx.providerId).toBe('prov-abc');
      expect(tx.status).toBe('APPROVED');
      expect(tx.providerResponse).toEqual({ id: 'prov-abc' });
    });
  });

  describe('Zod schemas', () => {
    const baseDto = {
      id: VALID_ID,
      providerId: null,
      reference: 'order-ref-001',
      amountInCents: 10000,
      currency: 'COP',
      status: 'PENDING' as const,
      statusMessage: null,
      paymentMethod: 'CARD' as const,
      customerEmail: 'customer@example.com',
      customerIp: '192.168.1.1',
      signature: 'sig-abc123',
      providerResponse: null,
      createdAt: new Date('2024-01-15T10:00:00.000Z'),
      updatedAt: new Date('2024-01-15T10:00:00.000Z'),
    };

    it('transactionSchema parses a valid full DTO', () => {
      const result = transactionSchema.safeParse(baseDto);
      expect(result.success).toBe(true);
    });

    it('transactionSchema rejects invalid status', () => {
      const result = transactionSchema.safeParse({ ...baseDto, status: 'UNKNOWN' });
      expect(result.success).toBe(false);
    });

    it('transactionSchema rejects invalid email', () => {
      const result = transactionSchema.safeParse({ ...baseDto, customerEmail: 'not-an-email' });
      expect(result.success).toBe(false);
    });

    it('transactionSchema rejects currency not exactly 3 chars', () => {
      const result = transactionSchema.safeParse({ ...baseDto, currency: 'US' });
      expect(result.success).toBe(false);
    });

    it('createTransactionSchema omits server-generated fields', () => {
      const input = {
        reference: 'order-ref-001',
        amountInCents: 10000,
        currency: 'COP',
        paymentMethod: 'NEQUI' as const,
        customerEmail: 'customer@example.com',
        customerIp: null,
      };
      const result = createTransactionSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('updateTransactionSchema accepts partial updates', () => {
      const result = updateTransactionSchema.safeParse({ status: 'APPROVED' });
      expect(result.success).toBe(true);
    });

    it('updateTransactionSchema accepts empty object', () => {
      const result = updateTransactionSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('updateTransactionSchema rejects invalid status', () => {
      const result = updateTransactionSchema.safeParse({ status: 'INVALID' });
      expect(result.success).toBe(false);
    });
  });

  describe('applyStatusUpdate()', () => {
    it('returns a new transaction with the updated status', () => {
      const result = Transaction.create(validInput);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const updated = result.value.applyStatusUpdate('APPROVED', 'OK', { raw: true });

      expect(updated.status).toBe('APPROVED');
      expect(updated.statusMessage).toBe('OK');
      expect(updated.providerResponse).toEqual({ raw: true });
      expect(updated.id).toBe(result.value.id);
      expect(updated.reference).toBe(result.value.reference);
    });

    it('preserves immutability — original is unchanged', () => {
      const result = Transaction.create(validInput);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const original = result.value;
      original.applyStatusUpdate('APPROVED', null, null);

      expect(original.status).toBe('PENDING');
    });
  });
});
