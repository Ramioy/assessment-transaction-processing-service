import { Injectable, Inject } from '@nestjs/common';

import { DI_TOKENS } from '@shared/di-tokens';
import { err, ok, type Result } from '@shared/result';
import type { InfrastructureError } from '@shared/errors/infrastructure.error';
import { transactionSchema, type TransactionDto } from '@domain/transaction/transaction.entity';
import type { TransactionRepository } from '@domain/transaction/transaction.repository';
import { TransactionNotFoundError } from '@domain/transaction/errors';
import type { PaymentProviderPort } from '@application/transaction/ports/payment-provider.port';

@Injectable()
export class GetTransactionStatusUseCase {
  constructor(
    @Inject(DI_TOKENS.TRANSACTION_REPOSITORY)
    private readonly repository: TransactionRepository,
    @Inject(DI_TOKENS.PAYMENT_PROVIDER)
    private readonly provider: PaymentProviderPort,
  ) {}

  async execute(
    id: string,
  ): Promise<Result<TransactionDto, TransactionNotFoundError | InfrastructureError>> {
    const txResult = await this.repository.findById(id);
    if (!txResult.ok) return txResult;
    if (txResult.value === null) {
      return err(new TransactionNotFoundError(id));
    }

    const tx = txResult.value;

    // Transaction not yet submitted to provider — return local record
    if (tx.providerId === null) {
      return ok(transactionSchema.parse(tx));
    }

    // Poll provider for latest status
    const statusResult = await this.provider.getTransactionStatus(tx.providerId);
    if (!statusResult.ok) return statusResult;

    const { status, statusMessage, raw } = statusResult.value;

    // No status change — return existing record without an extra write
    if (status === tx.status) {
      return ok(transactionSchema.parse(tx));
    }

    const updatedResult = await this.repository.updateStatus(
      tx.id,
      tx.providerId,
      status,
      statusMessage,
      raw,
    );
    if (!updatedResult.ok) return updatedResult;

    return ok(transactionSchema.parse(updatedResult.value));
  }
}
