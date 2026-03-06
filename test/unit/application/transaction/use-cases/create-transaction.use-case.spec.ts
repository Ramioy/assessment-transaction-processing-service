// @ts-nocheck
/* eslint-disable */
import { ConfigService } from '@nestjs/config';
import { CreateTransactionUseCase } from '@application/transaction/use-cases/create-transaction.use-case';
import { DuplicateReferenceError } from '@domain/transaction/errors/duplicate-reference.error';
import { TransactionCreationFailedError } from '@domain/transaction/errors/transaction-creation-failed.error';
import { InvalidAmountError } from '@domain/transaction/errors/invalid-amount.error';
import { InvalidPaymentMethodError } from '@domain/transaction/errors/invalid-payment-method.error';
import { InfrastructureError } from '@shared/errors/infrastructure.error';
import { ok, err } from '@shared/result';
import { makeMockTransactionRepository, makeMockPaymentProviderPort } from '../../../../helpers/mock-ports';
import { makeTransaction } from '../../../../helpers/transaction.helper';

const INTEGRITY_KEY = 'test-integrity-key';

function makeConfigService(): { getOrThrow: jest.Mock } {
  return { getOrThrow: jest.fn().mockReturnValue(INTEGRITY_KEY) };
}

const validInput = {
  reference: 'order-ref-001',
  amountInCents: 10000,
  currency: 'COP',
  paymentMethod: 'CARD',
  paymentMethodDetails: { type: 'CARD', token: 'tok-abc' },
  customerEmail: 'customer@example.com',
  customerIp: null,
};

const merchantConfig = {
  acceptanceToken: 'acc-token',
  presignedAcceptance: { acceptanceToken: 'acc-token', permalink: 'https://example.com', type: 'END_USER_POLICY' },
  paymentMethods: ['CARD'],
};

const providerResponse = {
  providerId: 'prov-123',
  status: 'PENDING',
  statusMessage: null,
  raw: {},
};

describe('CreateTransactionUseCase', () => {
  let useCase: CreateTransactionUseCase;
  let repo: ReturnType<typeof makeMockTransactionRepository>;
  let provider: ReturnType<typeof makeMockPaymentProviderPort>;
  let configService: ReturnType<typeof makeConfigService>;

  beforeEach(() => {
    repo = makeMockTransactionRepository();
    provider = makeMockPaymentProviderPort();
    configService = makeConfigService();
    useCase = new CreateTransactionUseCase(repo, provider, configService as unknown as ConfigService);
  });

  it('creates a transaction end-to-end and returns the updated DTO', async () => {
    repo.findByReference.mockResolvedValue(ok(null));
    provider.getMerchantConfig.mockResolvedValue(ok(merchantConfig));
    const saved = makeTransaction();
    repo.save.mockResolvedValue(ok(saved));
    provider.createTransaction.mockResolvedValue(ok(providerResponse));
    const updated = makeTransaction({ status: 'PENDING', providerId: 'prov-123' });
    repo.updateStatus.mockResolvedValue(ok(updated));

    const result = await useCase.execute(validInput);

    expect(result.ok).toBe(true);
    expect(repo.findByReference).toHaveBeenCalledWith('order-ref-001');
    expect(provider.getMerchantConfig).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(provider.createTransaction).toHaveBeenCalledTimes(1);
    expect(repo.updateStatus).toHaveBeenCalledTimes(1);
  });

  it('returns DuplicateReferenceError when reference already exists', async () => {
    repo.findByReference.mockResolvedValue(ok(makeTransaction()));

    const result = await useCase.execute(validInput);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(DuplicateReferenceError);
    expect(provider.getMerchantConfig).not.toHaveBeenCalled();
  });

  it('propagates infrastructure error from findByReference', async () => {
    const dbError = new InfrastructureError('DB_FAILED', new Error());
    repo.findByReference.mockResolvedValue(err(dbError));

    const result = await useCase.execute(validInput);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(dbError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('returns TransactionCreationFailedError when getMerchantConfig fails', async () => {
    repo.findByReference.mockResolvedValue(ok(null));
    provider.getMerchantConfig.mockResolvedValue(err(new InfrastructureError('PROVIDER_FAILED', new Error())));

    const result = await useCase.execute(validInput);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(TransactionCreationFailedError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('returns TransactionCreationFailedError when provider createTransaction fails', async () => {
    repo.findByReference.mockResolvedValue(ok(null));
    provider.getMerchantConfig.mockResolvedValue(ok(merchantConfig));
    repo.save.mockResolvedValue(ok(makeTransaction()));
    provider.createTransaction.mockResolvedValue(err(new InfrastructureError('TX_FAILED', new Error())));

    const result = await useCase.execute(validInput);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(TransactionCreationFailedError);
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it('propagates infrastructure error from save', async () => {
    repo.findByReference.mockResolvedValue(ok(null));
    provider.getMerchantConfig.mockResolvedValue(ok(merchantConfig));
    const saveError = new InfrastructureError('SAVE_FAILED', new Error());
    repo.save.mockResolvedValue(err(saveError));

    const result = await useCase.execute(validInput);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(saveError);
  });

  it('propagates infrastructure error from updateStatus', async () => {
    repo.findByReference.mockResolvedValue(ok(null));
    provider.getMerchantConfig.mockResolvedValue(ok(merchantConfig));
    repo.save.mockResolvedValue(ok(makeTransaction()));
    provider.createTransaction.mockResolvedValue(ok(providerResponse));
    const updateError = new InfrastructureError('UPDATE_FAILED', new Error());
    repo.updateStatus.mockResolvedValue(err(updateError));

    const result = await useCase.execute(validInput);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(updateError);
  });

  it('returns InvalidPaymentMethodError when entity creation fails due to invalid method', async () => {
    repo.findByReference.mockResolvedValue(ok(null));
    provider.getMerchantConfig.mockResolvedValue(ok(merchantConfig));

    const result = await useCase.execute({ ...validInput, paymentMethod: 'INVALID_METHOD' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(InvalidPaymentMethodError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('returns InvalidAmountError when entity creation fails due to invalid amount', async () => {
    repo.findByReference.mockResolvedValue(ok(null));
    provider.getMerchantConfig.mockResolvedValue(ok(merchantConfig));

    const result = await useCase.execute({ ...validInput, amountInCents: 0 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(InvalidAmountError);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('saves entity with PENDING status before submitting to provider', async () => {
    repo.findByReference.mockResolvedValue(ok(null));
    provider.getMerchantConfig.mockResolvedValue(ok(merchantConfig));
    repo.save.mockResolvedValue(ok(makeTransaction()));
    provider.createTransaction.mockResolvedValue(ok(providerResponse));
    repo.updateStatus.mockResolvedValue(ok(makeTransaction()));

    await useCase.execute(validInput);

    const savedEntity = repo.save.mock.calls[0][0];
    expect(savedEntity.status).toBe('PENDING');
    expect(savedEntity.providerId).toBeNull();
  });
});
