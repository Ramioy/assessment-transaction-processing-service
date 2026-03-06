export class TransactionCreationFailedError {
  readonly code = 'TRANSACTION_CREATION_FAILED' as const;
  readonly message: string;

  constructor(readonly reason: string) {
    this.message = `Transaction creation failed at the payment provider: ${reason}.`;
  }
}
