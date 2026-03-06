export class InvalidPaymentMethodError {
  readonly code = 'INVALID_PAYMENT_METHOD' as const;
  readonly message: string;

  constructor(readonly method: string) {
    this.message = `Payment method "${method}" is not supported.`;
  }
}
