import { z } from 'zod';
import { ok, err, type Result } from '@shared/result';
import { BaseEntity, baseSchema } from '@shared/base.entity';
import { VALID_STATUSES, VALID_PAYMENT_METHODS } from '@shared/constants/transaction.constants';
import { InvalidAmountError } from './errors/invalid-amount.error';
import { InvalidPaymentMethodError } from './errors/invalid-payment-method.error';

// Internal input for the static factory — includes server-generated fields.
// Not exported as an HTTP DTO; use createTransactionSchema for request validation.
type TransactionFactoryInput = {
  id: string;
  reference: string;
  amountInCents: number;
  currency: string;
  paymentMethod: string;
  customerEmail: string;
  customerIp: string | null;
  signature: string;
};

export class Transaction extends BaseEntity {
  private constructor(
    id: string,
    readonly providerId: string | null,
    readonly reference: string,
    readonly amountInCents: number,
    readonly currency: string,
    readonly status: string,
    readonly statusMessage: string | null,
    readonly paymentMethod: string,
    readonly customerEmail: string,
    readonly customerIp: string | null,
    readonly signature: string,
    readonly providerResponse: Record<string, unknown> | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {
    super(id);
  }

  static create(
    input: TransactionFactoryInput,
  ): Result<Transaction, InvalidAmountError | InvalidPaymentMethodError> {
    if (input.amountInCents <= 0 || !Number.isInteger(input.amountInCents)) {
      return err(new InvalidAmountError(input.amountInCents));
    }
    if (!VALID_PAYMENT_METHODS.includes(input.paymentMethod as never)) {
      return err(new InvalidPaymentMethodError(input.paymentMethod));
    }
    const now = new Date();
    return ok(
      new Transaction(
        input.id,
        null,
        input.reference,
        input.amountInCents,
        input.currency,
        'PENDING',
        null,
        input.paymentMethod,
        input.customerEmail,
        input.customerIp,
        input.signature,
        null,
        now,
        now,
      ),
    );
  }

  static fromPersistence(raw: TransactionDto): Transaction {
    return new Transaction(
      raw.id,
      raw.providerId,
      raw.reference,
      raw.amountInCents,
      raw.currency,
      raw.status,
      raw.statusMessage,
      raw.paymentMethod,
      raw.customerEmail,
      raw.customerIp,
      raw.signature,
      raw.providerResponse,
      raw.createdAt,
      raw.updatedAt,
    );
  }

  applyStatusUpdate(
    status: string,
    statusMessage: string | null,
    providerResponse: Record<string, unknown> | null,
  ): Transaction {
    return new Transaction(
      this.id,
      this.providerId,
      this.reference,
      this.amountInCents,
      this.currency,
      status,
      statusMessage,
      this.paymentMethod,
      this.customerEmail,
      this.customerIp,
      this.signature,
      providerResponse,
      this.createdAt,
      new Date(),
    );
  }
}

// ── Zod Schemas ────────────────────────────────────────────────

export const transactionSchema = baseSchema.extend({
  providerId: z.string().nullable(),
  reference: z.string().min(1).max(255),
  amountInCents: z.number().int().positive(),
  currency: z.string().length(3),
  status: z.enum(VALID_STATUSES),
  statusMessage: z.string().nullable(),
  paymentMethod: z.enum(VALID_PAYMENT_METHODS),
  customerEmail: z.string().email(),
  customerIp: z.string().nullable(),
  signature: z.string().min(1),
  providerResponse: z.record(z.string(), z.unknown()).nullable(),
});

// Used for HTTP request body validation when creating a transaction
export const createTransactionSchema = transactionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  providerId: true,
  status: true,
  statusMessage: true,
  providerResponse: true,
  signature: true,
});

export const updateTransactionSchema = transactionSchema
  .pick({
    status: true,
    statusMessage: true,
    providerResponse: true,
  })
  .partial();

export type TransactionDto = z.infer<typeof transactionSchema>;
export type CreateTransactionDto = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionDto = z.infer<typeof updateTransactionSchema>;
