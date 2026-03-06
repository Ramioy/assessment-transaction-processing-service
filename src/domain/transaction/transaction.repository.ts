import type { Result } from '@shared/result';
import type { InfrastructureError } from '@shared/errors/infrastructure.error';
import type { Transaction } from './transaction.entity';

export interface TransactionRepository {
  save(tx: Transaction): Promise<Result<Transaction, InfrastructureError>>;
  findById(id: string): Promise<Result<Transaction | null, InfrastructureError>>;
  findByReference(reference: string): Promise<Result<Transaction | null, InfrastructureError>>;
  findByProviderId(providerId: string): Promise<Result<Transaction | null, InfrastructureError>>;
  updateStatus(
    id: string,
    providerId: string | null,
    status: string,
    statusMessage: string | null,
    providerResponse: Record<string, unknown> | null,
  ): Promise<Result<Transaction, InfrastructureError>>;
}
