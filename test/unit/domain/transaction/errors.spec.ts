// @ts-nocheck
/* eslint-disable */
import { TransactionNotFoundError } from '@domain/transaction/errors/transaction-not-found.error';
import { DuplicateReferenceError } from '@domain/transaction/errors/duplicate-reference.error';
import { InvalidAmountError } from '@domain/transaction/errors/invalid-amount.error';
import { InvalidPaymentMethodError } from '@domain/transaction/errors/invalid-payment-method.error';
import { TokenizationFailedError } from '@domain/transaction/errors/tokenization-failed.error';
import { TransactionCreationFailedError } from '@domain/transaction/errors/transaction-creation-failed.error';
import { WebhookValidationFailedError } from '@domain/transaction/errors/webhook-validation-failed.error';

describe('Domain errors', () => {
  describe('TransactionNotFoundError', () => {
    it('sets code to TRANSACTION_NOT_FOUND', () => {
      expect(new TransactionNotFoundError('abc').code).toBe('TRANSACTION_NOT_FOUND');
    });

    it('includes identifier in message', () => {
      expect(new TransactionNotFoundError('abc-123').message).toContain('abc-123');
    });
  });

  describe('DuplicateReferenceError', () => {
    it('sets code to DUPLICATE_REFERENCE', () => {
      expect(new DuplicateReferenceError('ref-001').code).toBe('DUPLICATE_REFERENCE');
    });

    it('includes reference in message', () => {
      expect(new DuplicateReferenceError('ref-001').message).toContain('ref-001');
    });
  });

  describe('InvalidAmountError', () => {
    it('sets code to INVALID_AMOUNT', () => {
      expect(new InvalidAmountError(0).code).toBe('INVALID_AMOUNT');
    });

    it('includes the invalid amount in message', () => {
      expect(new InvalidAmountError(-5).message).toContain('-5');
    });
  });

  describe('InvalidPaymentMethodError', () => {
    it('sets code to INVALID_PAYMENT_METHOD', () => {
      expect(new InvalidPaymentMethodError('WIRE').code).toBe('INVALID_PAYMENT_METHOD');
    });

    it('includes the method name in message', () => {
      expect(new InvalidPaymentMethodError('WIRE').message).toContain('WIRE');
    });
  });

  describe('TokenizationFailedError', () => {
    it('sets code to TOKENIZATION_FAILED', () => {
      expect(new TokenizationFailedError('network error').code).toBe('TOKENIZATION_FAILED');
    });

    it('includes reason in message', () => {
      expect(new TokenizationFailedError('network error').message).toContain('network error');
    });
  });

  describe('TransactionCreationFailedError', () => {
    it('sets code to TRANSACTION_CREATION_FAILED', () => {
      expect(new TransactionCreationFailedError('timeout').code).toBe('TRANSACTION_CREATION_FAILED');
    });

    it('includes reason in message', () => {
      expect(new TransactionCreationFailedError('timeout').message).toContain('timeout');
    });
  });

  describe('WebhookValidationFailedError', () => {
    it('sets code to WEBHOOK_VALIDATION_FAILED', () => {
      expect(new WebhookValidationFailedError('checksum mismatch').code).toBe(
        'WEBHOOK_VALIDATION_FAILED',
      );
    });

    it('includes reason in message', () => {
      expect(new WebhookValidationFailedError('checksum mismatch').message).toContain(
        'checksum mismatch',
      );
    });
  });
});
