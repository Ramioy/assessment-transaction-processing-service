// @ts-nocheck
/* eslint-disable */
import { GetTransactionStatusUseCase } from '@application/transaction/use-cases/get-transaction-status.use-case';
import { TransactionNotFoundError } from '@domain/transaction/errors/transaction-not-found.error';
import { InfrastructureError } from '@shared/errors/infrastructure.error';
import { ok, err } from '@shared/result';
import { makeMockTransactionRepository, makeMockPaymentProviderPort } from '../../../../helpers/mock-ports';
import { makeTransaction } from '../../../../helpers/transaction.helper';

const ID = '11111111-2222-4333-8444-555555555555';

describe('GetTransactionStatusUseCase', () => {
  let useCase: GetTransactionStatusUseCase;
  let repo: ReturnType<typeof makeMockTransactionRepository>;
  let provider: ReturnType<typeof makeMockPaymentProviderPort>;

  beforeEach(() => {
    repo = makeMockTransactionRepository();
    provider = makeMockPaymentProviderPort();
    useCase = new GetTransactionStatusUseCase(repo, provider);
  });

  it('returns TransactionNotFoundError when no record exists', async () => {
    repo.findById.mockResolvedValue(ok(null));

    const result = await useCase.execute(ID);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(TransactionNotFoundError);
    expect(provider.getTransactionStatus).not.toHaveBeenCalled();
  });

  it('returns local record without polling provider when providerId is null', async () => {
    const tx = makeTransaction({ providerId: null });
    repo.findById.mockResolvedValue(ok(tx));

    const result = await useCase.execute(ID);

    expect(result.ok).toBe(true);
    expect(provider.getTransactionStatus).not.toHaveBeenCalled();
  });

  it('returns existing record without update when provider status has not changed', async () => {
    const tx = makeTransaction({ providerId: 'prov-123', status: 'PENDING' });
    repo.findById.mockResolvedValue(ok(tx));
    provider.getTransactionStatus.mockResolvedValue(ok({ status: 'PENDING', statusMessage: null, raw: {} }));

    const result = await useCase.execute(ID);

    expect(result.ok).toBe(true);
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it('updates local record when provider status has changed', async () => {
    const tx = makeTransaction({ providerId: 'prov-123', status: 'PENDING' });
    repo.findById.mockResolvedValue(ok(tx));
    provider.getTransactionStatus.mockResolvedValue(ok({ status: 'APPROVED', statusMessage: 'OK', raw: {} }));
    const updated = makeTransaction({ status: 'APPROVED' });
    repo.updateStatus.mockResolvedValue(ok(updated));

    const result = await useCase.execute(ID);

    expect(result.ok).toBe(true);
    expect(repo.updateStatus).toHaveBeenCalledWith(tx.id, 'prov-123', 'APPROVED', 'OK', {});
  });

  it('propagates infrastructure error from findById', async () => {
    const dbError = new InfrastructureError('DB_FAILED', new Error());
    repo.findById.mockResolvedValue(err(dbError));

    const result = await useCase.execute(ID);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(dbError);
  });

  it('propagates infrastructure error from getTransactionStatus', async () => {
    const tx = makeTransaction({ providerId: 'prov-123', status: 'PENDING' });
    repo.findById.mockResolvedValue(ok(tx));
    const providerError = new InfrastructureError('PROVIDER_FAILED', new Error());
    provider.getTransactionStatus.mockResolvedValue(err(providerError));

    const result = await useCase.execute(ID);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(providerError);
  });

  it('propagates infrastructure error from updateStatus', async () => {
    const tx = makeTransaction({ providerId: 'prov-123', status: 'PENDING' });
    repo.findById.mockResolvedValue(ok(tx));
    provider.getTransactionStatus.mockResolvedValue(ok({ status: 'APPROVED', statusMessage: null, raw: {} }));
    const updateError = new InfrastructureError('UPDATE_FAILED', new Error());
    repo.updateStatus.mockResolvedValue(err(updateError));

    const result = await useCase.execute(ID);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(updateError);
  });
});
