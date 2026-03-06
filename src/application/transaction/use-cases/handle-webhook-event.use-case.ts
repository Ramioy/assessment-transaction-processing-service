import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DI_TOKENS } from '@shared/di-tokens';
import { err, ok, type Result } from '@shared/result';
import type { InfrastructureError } from '@shared/errors/infrastructure.error';
import { validateWebhookChecksum } from '@shared/crypto/webhook-checksum';
import type { TransactionRepository } from '@domain/transaction/transaction.repository';
import { WebhookValidationFailedError } from '@domain/transaction/errors';

export type WebhookEventInput = {
  checksum: string;
  // Values extracted from the body for the properties listed in signature.properties
  propertyValues: string[];
  timestamp: number;
  data: {
    providerId: string;
    status: string;
    statusMessage: string | null;
    raw: Record<string, unknown>;
  };
};

@Injectable()
export class HandleWebhookEventUseCase {
  constructor(
    @Inject(DI_TOKENS.TRANSACTION_REPOSITORY)
    private readonly repository: TransactionRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    input: WebhookEventInput,
  ): Promise<Result<void, WebhookValidationFailedError | InfrastructureError>> {
    // Step 1 — Validate checksum to authenticate the event
    const eventsKey = this.configService.getOrThrow<string>('PAYMENT_PROVIDER_EVENTS_KEY');
    const isValid = validateWebhookChecksum(
      input.propertyValues,
      input.timestamp,
      eventsKey,
      input.checksum,
    );
    if (!isValid) {
      return err(new WebhookValidationFailedError('checksum mismatch'));
    }

    // Step 2 — Find local record by provider-assigned transaction ID
    const txResult = await this.repository.findByProviderId(input.data.providerId);
    if (!txResult.ok) return txResult;

    // No matching local record — cannot reconcile without full transaction data
    if (txResult.value === null) {
      return ok(undefined);
    }

    // Step 3 — Update status from the event payload
    const updateResult = await this.repository.updateStatus(
      txResult.value.id,
      input.data.providerId,
      input.data.status,
      input.data.statusMessage,
      input.data.raw,
    );
    if (!updateResult.ok) return updateResult;

    return ok(undefined);
  }
}
