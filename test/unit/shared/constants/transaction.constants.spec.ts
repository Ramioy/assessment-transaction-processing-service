// @ts-nocheck
/* eslint-disable */
import {
  VALID_STATUSES,
  VALID_PAYMENT_METHODS,
  DEFAULT_CURRENCY,
} from '@shared/constants/transaction.constants';

describe('Transaction constants', () => {
  describe('VALID_STATUSES', () => {
    it('contains all expected transaction statuses', () => {
      expect(VALID_STATUSES).toContain('PENDING');
      expect(VALID_STATUSES).toContain('APPROVED');
      expect(VALID_STATUSES).toContain('DECLINED');
      expect(VALID_STATUSES).toContain('VOIDED');
      expect(VALID_STATUSES).toContain('ERROR');
    });

    it('has exactly 5 statuses', () => {
      expect(VALID_STATUSES).toHaveLength(5);
    });
  });

  describe('VALID_PAYMENT_METHODS', () => {
    it('contains all expected payment methods', () => {
      expect(VALID_PAYMENT_METHODS).toContain('CARD');
      expect(VALID_PAYMENT_METHODS).toContain('NEQUI');
      expect(VALID_PAYMENT_METHODS).toContain('PSE');
      expect(VALID_PAYMENT_METHODS).toContain('BANCOLOMBIA_TRANSFER');
      expect(VALID_PAYMENT_METHODS).toContain('BANCOLOMBIA_QR');
      expect(VALID_PAYMENT_METHODS).toContain('CORRESPONSAL');
      expect(VALID_PAYMENT_METHODS).toContain('PCOL');
      expect(VALID_PAYMENT_METHODS).toContain('DAVIPLATA');
    });

    it('has exactly 8 payment methods', () => {
      expect(VALID_PAYMENT_METHODS).toHaveLength(8);
    });
  });

  describe('DEFAULT_CURRENCY', () => {
    it('is COP', () => {
      expect(DEFAULT_CURRENCY).toBe('COP');
    });
  });
});
