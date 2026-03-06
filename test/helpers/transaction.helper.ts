import { Transaction } from '@domain/transaction/transaction.entity';

const NOW = new Date('2024-01-15T10:00:00.000Z');
const DEFAULT_ID = '11111111-2222-4333-8444-555555555555';

export function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return Transaction.fromPersistence({
    id: DEFAULT_ID,
    providerId: null,
    reference: 'order-ref-001',
    amountInCents: 10000,
    currency: 'COP',
    status: 'PENDING',
    statusMessage: null,
    paymentMethod: 'CARD',
    customerEmail: 'customer@example.com',
    customerIp: '192.168.1.1',
    signature: 'abc123signaturevalue',
    providerResponse: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  });
}
