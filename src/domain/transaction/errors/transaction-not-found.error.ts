export class TransactionNotFoundError {
  readonly code = 'TRANSACTION_NOT_FOUND' as const;
  readonly message: string;

  constructor(readonly identifier: string) {
    this.message = `Transaction "${identifier}" was not found.`;
  }
}
