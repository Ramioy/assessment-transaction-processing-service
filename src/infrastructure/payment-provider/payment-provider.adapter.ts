import { Injectable } from '@nestjs/common';

import { err, fromPromise, fromThrowable, type Result } from '@shared/result';
import { InfrastructureError } from '@shared/errors/infrastructure.error';
import type {
  CardTokenizationDto,
  MerchantConfigDto,
  PaymentProviderPort,
  ProviderStatusResponseDto,
  ProviderTransactionDto,
  ProviderTransactionResponseDto,
  PseInstitutionDto,
  TokenResponseDto,
} from '@application/transaction/ports/payment-provider.port';
import { PaymentProviderConfig } from './payment-provider.config';
import { ProviderTransactionMapper } from './mappers/provider-transaction.mapper';

@Injectable()
export class PaymentProviderAdapter implements PaymentProviderPort {
  constructor(private readonly config: PaymentProviderConfig) {}

  // ── Private helpers ──────────────────────────────────────────

  private wrapError(reason: string) {
    return (cause: unknown) => new InfrastructureError(reason, cause);
  }

  private bearerHeaders(usePrivateKey = false): HeadersInit {
    const key = usePrivateKey ? this.config.privateKey : this.config.publicKey;
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    };
  }

  /** Performs a request and returns parsed JSON. Fails on any non-2xx response. */
  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    usePrivateKey = false,
  ): Promise<Result<unknown, InfrastructureError>> {
    const fetchResult = await fromPromise(
      fetch(`${this.config.baseUrl}${path}`, {
        method,
        headers: this.bearerHeaders(usePrivateKey),
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      }),
      this.wrapError('PAYMENT_PROVIDER_REQUEST_FAILED'),
    );
    if (!fetchResult.ok) return fetchResult;

    const response = fetchResult.value;
    if (!response.ok) {
      return err(
        new InfrastructureError(
          'PAYMENT_PROVIDER_HTTP_ERROR',
          `${response.status} ${response.statusText}`,
        ),
      );
    }

    return fromPromise(
      response.json() as Promise<unknown>,
      this.wrapError('PAYMENT_PROVIDER_RESPONSE_PARSE_FAILED'),
    );
  }

  // ── PaymentProviderPort implementation ───────────────────────

  async tokenizeCard(
    cardData: CardTokenizationDto,
  ): Promise<Result<TokenResponseDto, InfrastructureError>> {
    const result = await this.request('POST', '/v1/tokens/cards', {
      number: cardData.number,
      exp_month: cardData.expMonth,
      exp_year: cardData.expYear,
      cvc: cardData.cvc,
      card_holder: cardData.cardHolder,
    });
    if (!result.ok) return result;

    return fromThrowable(
      () => ProviderTransactionMapper.toTokenResponse(result.value),
      this.wrapError('PAYMENT_PROVIDER_RESPONSE_PARSE_FAILED'),
    );
  }

  async createTransaction(
    data: ProviderTransactionDto,
  ): Promise<Result<ProviderTransactionResponseDto, InfrastructureError>> {
    const result = await this.request(
      'POST',
      '/v1/transactions',
      {
        amount_in_cents: data.amountInCents,
        currency: data.currency,
        customer_email: data.customerEmail,
        payment_method: ProviderTransactionMapper.toProviderPaymentMethod(data.paymentMethod),
        reference: data.reference,
        signature: data.signature,
        acceptance_token: data.acceptanceToken,
        ip: data.ip,
      },
      true, // private key for write operations
    );
    if (!result.ok) return result;

    return fromThrowable(
      () => ProviderTransactionMapper.toProviderTransactionResponse(result.value),
      this.wrapError('PAYMENT_PROVIDER_RESPONSE_PARSE_FAILED'),
    );
  }

  async getTransactionStatus(
    transactionId: string,
  ): Promise<Result<ProviderStatusResponseDto, InfrastructureError>> {
    const result = await this.request(
      'GET',
      `/v1/transactions/${encodeURIComponent(transactionId)}`,
    );
    if (!result.ok) return result;

    return fromThrowable(
      () => ProviderTransactionMapper.toProviderStatusResponse(result.value),
      this.wrapError('PAYMENT_PROVIDER_RESPONSE_PARSE_FAILED'),
    );
  }

  async getMerchantConfig(): Promise<Result<MerchantConfigDto, InfrastructureError>> {
    // Public key is part of the URL path — no Authorization header required
    const fetchResult = await fromPromise(
      fetch(`${this.config.baseUrl}/v1/merchants/${encodeURIComponent(this.config.publicKey)}`),
      this.wrapError('PAYMENT_PROVIDER_REQUEST_FAILED'),
    );
    if (!fetchResult.ok) return fetchResult;

    if (!fetchResult.value.ok) {
      return err(
        new InfrastructureError(
          'PAYMENT_PROVIDER_HTTP_ERROR',
          `${fetchResult.value.status} ${fetchResult.value.statusText}`,
        ),
      );
    }

    const bodyResult = await fromPromise(
      fetchResult.value.json() as Promise<unknown>,
      this.wrapError('PAYMENT_PROVIDER_RESPONSE_PARSE_FAILED'),
    );
    if (!bodyResult.ok) return bodyResult;

    return fromThrowable(
      () => ProviderTransactionMapper.toMerchantConfig(bodyResult.value),
      this.wrapError('PAYMENT_PROVIDER_RESPONSE_PARSE_FAILED'),
    );
  }

  async listPseInstitutions(): Promise<Result<PseInstitutionDto[], InfrastructureError>> {
    const result = await this.request('GET', '/v1/pse/financial_institutions');
    if (!result.ok) return result;

    return fromThrowable(
      () => {
        const data = (result.value as { data: Array<Record<string, unknown>> }).data;
        return data.map((item) => ProviderTransactionMapper.toPseInstitution(item));
      },
      this.wrapError('PAYMENT_PROVIDER_RESPONSE_PARSE_FAILED'),
    );
  }
}
