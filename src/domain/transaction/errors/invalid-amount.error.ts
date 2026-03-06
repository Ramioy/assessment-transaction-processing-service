export class InvalidAmountError {
  readonly code = 'INVALID_AMOUNT' as const;
  readonly message: string;

  constructor(readonly amountInCents: number) {
    this.message = `Amount ${amountInCents} cents is invalid. Must be a positive integer.`;
  }
}
