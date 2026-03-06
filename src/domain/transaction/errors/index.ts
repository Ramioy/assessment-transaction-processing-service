export { TransactionNotFoundError } from './transaction-not-found.error';
export { DuplicateReferenceError } from './duplicate-reference.error';
export { InvalidAmountError } from './invalid-amount.error';
export { TokenizationFailedError } from './tokenization-failed.error';
export { TransactionCreationFailedError } from './transaction-creation-failed.error';
export { InvalidPaymentMethodError } from './invalid-payment-method.error';
export { WebhookValidationFailedError } from './webhook-validation-failed.error';

export type TransactionError =
  | TransactionNotFoundError
  | DuplicateReferenceError
  | InvalidAmountError
  | TokenizationFailedError
  | TransactionCreationFailedError
  | InvalidPaymentMethodError
  | WebhookValidationFailedError;
