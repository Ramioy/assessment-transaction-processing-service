export class DuplicateReferenceError {
  readonly code = 'DUPLICATE_REFERENCE' as const;
  readonly message: string;

  constructor(readonly reference: string) {
    this.message = `A transaction with reference "${reference}" already exists.`;
  }
}
