import { Injectable } from '@nestjs/common';

import { err, fromPromise, fromThrowable, ok, type Result } from '@shared/result';
import { InfrastructureError } from '@shared/errors/infrastructure.error';
import { Transaction, transactionSchema } from '@domain/transaction/transaction.entity';
import type { TransactionRepository } from '@domain/transaction/transaction.repository';
import { DbDomainServiceConfig } from './db-domain-service.config';

@Injectable()
export class DbDomainServiceAdapter implements TransactionRepository {
  constructor(private readonly config: DbDomainServiceConfig) {}

  // ── Private helpers ──────────────────────────────────────────

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
    };
  }

  private wrapError(reason: string) {
    return (cause: unknown) => new InfrastructureError(reason, cause);
  }

  /** Performs a request and returns parsed JSON. Fails on any non-2xx response. */
  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Result<unknown, InfrastructureError>> {
    const fetchResult = await fromPromise(
      fetch(`${this.config.baseUrl}${path}`, {
        method,
        headers: this.headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      }),
      this.wrapError('DB_DOMAIN_SERVICE_REQUEST_FAILED'),
    );
    if (!fetchResult.ok) return fetchResult;

    const response = fetchResult.value;
    if (!response.ok) {
      return err(
        new InfrastructureError(
          'DB_DOMAIN_SERVICE_HTTP_ERROR',
          `${response.status} ${response.statusText}`,
        ),
      );
    }

    return fromPromise(
      response.json() as Promise<unknown>,
      this.wrapError('DB_DOMAIN_SERVICE_RESPONSE_PARSE_FAILED'),
    );
  }

  /** Like request() but returns null on 404 instead of an error. */
  private async requestOptional(path: string): Promise<Result<unknown, InfrastructureError>> {
    const fetchResult = await fromPromise(
      fetch(`${this.config.baseUrl}${path}`, { headers: this.headers }),
      this.wrapError('DB_DOMAIN_SERVICE_REQUEST_FAILED'),
    );
    if (!fetchResult.ok) return fetchResult;

    const response = fetchResult.value;
    if (response.status === 404) return ok(null);
    if (!response.ok) {
      return err(
        new InfrastructureError(
          'DB_DOMAIN_SERVICE_HTTP_ERROR',
          `${response.status} ${response.statusText}`,
        ),
      );
    }

    return fromPromise(
      response.json() as Promise<unknown>,
      this.wrapError('DB_DOMAIN_SERVICE_RESPONSE_PARSE_FAILED'),
    );
  }

  /** Parses a raw API response into a Transaction domain entity. */
  private toTransaction(raw: unknown): Result<Transaction, InfrastructureError> {
    return fromThrowable(
      () => Transaction.fromPersistence(transactionSchema.parse(raw)),
      this.wrapError('DB_DOMAIN_SERVICE_RESPONSE_PARSE_FAILED'),
    );
  }

  // ── TransactionRepository implementation ─────────────────────

  async save(tx: Transaction): Promise<Result<Transaction, InfrastructureError>> {
    const result = await this.request('POST', '/payment-transactions', {
      id: tx.id,
      providerId: tx.providerId,
      reference: tx.reference,
      amountInCents: tx.amountInCents,
      currency: tx.currency,
      status: tx.status,
      statusMessage: tx.statusMessage,
      paymentMethod: tx.paymentMethod,
      customerEmail: tx.customerEmail,
      customerIp: tx.customerIp,
      signature: tx.signature,
      providerResponse: tx.providerResponse,
    });
    if (!result.ok) return result;
    return this.toTransaction(result.value);
  }

  async findById(id: string): Promise<Result<Transaction | null, InfrastructureError>> {
    const result = await this.requestOptional(`/payment-transactions/${encodeURIComponent(id)}`);
    if (!result.ok) return result;
    if (result.value === null) return ok(null);
    return this.toTransaction(result.value);
  }

  async findByReference(
    reference: string,
  ): Promise<Result<Transaction | null, InfrastructureError>> {
    const result = await this.requestOptional(
      `/payment-transactions/by-reference/${encodeURIComponent(reference)}`,
    );
    if (!result.ok) return result;
    if (result.value === null) return ok(null);
    return this.toTransaction(result.value);
  }

  async findByProviderId(
    providerId: string,
  ): Promise<Result<Transaction | null, InfrastructureError>> {
    const result = await this.requestOptional(
      `/payment-transactions/by-provider-id/${encodeURIComponent(providerId)}`,
    );
    if (!result.ok) return result;
    if (result.value === null) return ok(null);
    return this.toTransaction(result.value);
  }

  async updateStatus(
    id: string,
    providerId: string | null,
    status: string,
    statusMessage: string | null,
    providerResponse: Record<string, unknown> | null,
  ): Promise<Result<Transaction, InfrastructureError>> {
    const result = await this.request(
      'PATCH',
      `/payment-transactions/${encodeURIComponent(id)}/status`,
      { providerId, status, statusMessage, providerResponse },
    );
    if (!result.ok) return result;
    return this.toTransaction(result.value);
  }
}
