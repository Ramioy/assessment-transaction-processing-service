import type { Result } from '@shared/result';
import type { InfrastructureError } from '@shared/errors/infrastructure.error';
import type { PaymentMethod } from '@domain/payment-method/payment-method.value-object';

// ── Card Tokenization ──────────────────────────────────────────

export type CardTokenizationDto = {
  number: string;
  expMonth: string;
  expYear: string;
  cvc: string;
  cardHolder: string;
};

export type TokenResponseDto = {
  tokenId: string;
  brand: string;
  lastFour: string;
  expiresAt: string;
};

// ── Transaction Creation ───────────────────────────────────────

export type ProviderTransactionDto = {
  amountInCents: number;
  currency: string;
  customerEmail: string;
  paymentMethod: PaymentMethod;
  reference: string;
  signature: string;
  acceptanceToken: string;
  ip: string | null;
};

export type ProviderTransactionResponseDto = {
  providerId: string;
  status: string;
  statusMessage: string | null;
  raw: Record<string, unknown>;
};

// ── Status Query ───────────────────────────────────────────────

export type ProviderStatusResponseDto = {
  status: string;
  statusMessage: string | null;
  raw: Record<string, unknown>;
};

// ── Merchant Config ────────────────────────────────────────────

export type MerchantConfigDto = {
  acceptanceToken: string;
  presignedAcceptance: {
    acceptanceToken: string;
    permalink: string;
    type: string;
  };
  paymentMethods: string[];
};

// ── PSE Institutions ───────────────────────────────────────────

export type PseInstitutionDto = {
  financialInstitutionCode: string;
  name: string;
};

// ── Port Interface ─────────────────────────────────────────────

export interface PaymentProviderPort {
  tokenizeCard(
    cardData: CardTokenizationDto,
  ): Promise<Result<TokenResponseDto, InfrastructureError>>;

  createTransaction(
    data: ProviderTransactionDto,
  ): Promise<Result<ProviderTransactionResponseDto, InfrastructureError>>;

  getTransactionStatus(
    transactionId: string,
  ): Promise<Result<ProviderStatusResponseDto, InfrastructureError>>;

  getMerchantConfig(): Promise<Result<MerchantConfigDto, InfrastructureError>>;

  listPseInstitutions(): Promise<Result<PseInstitutionDto[], InfrastructureError>>;
}
