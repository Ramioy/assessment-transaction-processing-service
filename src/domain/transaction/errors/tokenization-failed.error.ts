export class TokenizationFailedError {
  readonly code = 'TOKENIZATION_FAILED' as const;
  readonly message: string;

  constructor(readonly reason: string) {
    this.message = `Card tokenization failed: ${reason}.`;
  }
}
