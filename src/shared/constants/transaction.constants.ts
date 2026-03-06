export const VALID_STATUSES = ['PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR'] as const;

export const VALID_PAYMENT_METHODS = [
  'CARD',
  'NEQUI',
  'PSE',
  'BANCOLOMBIA_TRANSFER',
  'BANCOLOMBIA_QR',
  'CORRESPONSAL',
  'PCOL',
  'DAVIPLATA',
] as const;

export const DEFAULT_CURRENCY = 'COP';

export type TransactionStatus = (typeof VALID_STATUSES)[number];
export type PaymentMethod = (typeof VALID_PAYMENT_METHODS)[number];
