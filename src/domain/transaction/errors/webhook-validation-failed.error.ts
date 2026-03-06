export class WebhookValidationFailedError {
  readonly code = 'WEBHOOK_VALIDATION_FAILED' as const;
  readonly message: string;

  constructor(readonly reason: string) {
    this.message = `Webhook event validation failed: ${reason}.`;
  }
}
