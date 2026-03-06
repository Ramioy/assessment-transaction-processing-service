import { randomUUID } from 'node:crypto';

import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DI_TOKENS } from '@shared/di-tokens';
import { err, ok, type Result } from '@shared/result';
import { generateIntegritySignature } from '@shared/crypto/integrity-signature';
import type { InfrastructureError } from '@shared/errors/infrastructure.error';
import {
  Transaction,
  transactionSchema,
  type TransactionDto,
} from '@domain/transaction/transaction.entity';
import type { TransactionRepository } from '@domain/transaction/transaction.repository';
import {
  DuplicateReferenceError,
  TransactionCreationFailedError,
} from '@domain/transaction/errors';
import type { TransactionError } from '@domain/transaction/errors';
import type { PaymentMethod } from '@domain/payment-method/payment-method.value-object';
import type { PaymentProviderPort } from '@application/transaction/ports/payment-provider.port';

export type CreateTransactionInput = {
  reference: string;
  amountInCents: number;
  currency: string;
  paymentMethod: string;
  paymentMethodDetails: PaymentMethod;
  customerEmail: string;
  customerIp: string | null;
};

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(DI_TOKENS.TRANSACTION_REPOSITORY)
    private readonly repository: TransactionRepository,
    @Inject(DI_TOKENS.PAYMENT_PROVIDER)
    private readonly provider: PaymentProviderPort,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    input: CreateTransactionInput,
  ): Promise<Result<TransactionDto, TransactionError | InfrastructureError>> {
    // Step 1 — Guard against duplicate reference
    const existingResult = await this.repository.findByReference(input.reference);
    if (!existingResult.ok) return existingResult;
    if (existingResult.value !== null) {
      return err(new DuplicateReferenceError(input.reference));
    }

    // Step 2 — Fetch merchant acceptance token
    const merchantResult = await this.provider.getMerchantConfig();
    if (!merchantResult.ok) {
      return err(new TransactionCreationFailedError(merchantResult.error.reason));
    }

    // Step 3 — Generate integrity signature
    const integrityKey = this.configService.getOrThrow<string>('PAYMENT_PROVIDER_INTEGRITY_KEY');
    const signature = generateIntegritySignature(
      input.reference,
      input.amountInCents,
      input.currency,
      integrityKey,
    );

    // Step 4 — Create domain entity (validates amount and payment method)
    const entityResult = Transaction.create({
      id: randomUUID(),
      reference: input.reference,
      amountInCents: input.amountInCents,
      currency: input.currency,
      paymentMethod: input.paymentMethod,
      customerEmail: input.customerEmail,
      customerIp: input.customerIp,
      signature,
    });
    if (!entityResult.ok) return entityResult;

    // Step 5 — Persist locally with PENDING status
    const savedResult = await this.repository.save(entityResult.value);
    if (!savedResult.ok) return savedResult;

    // Step 6 — Submit to payment provider
    const providerResult = await this.provider.createTransaction({
      amountInCents: savedResult.value.amountInCents,
      currency: savedResult.value.currency,
      customerEmail: savedResult.value.customerEmail,
      paymentMethod: input.paymentMethodDetails,
      reference: savedResult.value.reference,
      signature: savedResult.value.signature,
      acceptanceToken: merchantResult.value.acceptanceToken,
      ip: savedResult.value.customerIp,
    });
    if (!providerResult.ok) {
      return err(new TransactionCreationFailedError(providerResult.error.reason));
    }

    // Step 7 — Update local record with provider ID and initial status
    const updatedResult = await this.repository.updateStatus(
      savedResult.value.id,
      providerResult.value.providerId,
      providerResult.value.status,
      providerResult.value.statusMessage,
      providerResult.value.raw,
    );
    if (!updatedResult.ok) return updatedResult;

    return ok(transactionSchema.parse(updatedResult.value));
  }
}
