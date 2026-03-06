import type { TransactionRepository } from '@domain/transaction/transaction.repository';
import type { PaymentProviderPort } from '@application/transaction/ports/payment-provider.port';

type Mocked<T> = { [K in keyof T]: jest.Mock };

export function makeMockTransactionRepository(): Mocked<TransactionRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByReference: jest.fn(),
    findByProviderId: jest.fn(),
    updateStatus: jest.fn(),
  };
}

export function makeMockPaymentProviderPort(): Mocked<PaymentProviderPort> {
  return {
    tokenizeCard: jest.fn(),
    createTransaction: jest.fn(),
    getTransactionStatus: jest.fn(),
    getMerchantConfig: jest.fn(),
    listPseInstitutions: jest.fn(),
  };
}
