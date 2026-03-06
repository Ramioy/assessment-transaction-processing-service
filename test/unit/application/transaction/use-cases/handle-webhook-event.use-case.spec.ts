// @ts-nocheck
/* eslint-disable */
import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { HandleWebhookEventUseCase } from '@application/transaction/use-cases/handle-webhook-event.use-case';
import { WebhookValidationFailedError } from '@domain/transaction/errors/webhook-validation-failed.error';
import { InfrastructureError } from '@shared/errors/infrastructure.error';
import { ok, err } from '@shared/result';
import { makeMockTransactionRepository } from '../../../../helpers/mock-ports';
import { makeTransaction } from '../../../../helpers/transaction.helper';

const EVENTS_KEY = 'test-events-key';
const PROPERTY_VALUES = ['APPROVED', 'order-ref-001', '10000'];
const TIMESTAMP = 1700000000;

function computeChecksum(values: string[], ts: number, key: string): string {
  return createHash('sha256')
    .update([...values, String(ts), key].join(''))
    .digest('hex');
}

const VALID_CHECKSUM = computeChecksum(PROPERTY_VALUES, TIMESTAMP, EVENTS_KEY);

function makeConfigService(): { getOrThrow: jest.Mock } {
  return { getOrThrow: jest.fn().mockReturnValue(EVENTS_KEY) };
}

const validInput = {
  checksum: VALID_CHECKSUM,
  propertyValues: PROPERTY_VALUES,
  timestamp: TIMESTAMP,
  data: {
    providerId: 'prov-123',
    status: 'APPROVED',
    statusMessage: null,
    raw: {},
  },
};

describe('HandleWebhookEventUseCase', () => {
  let useCase: HandleWebhookEventUseCase;
  let repo: ReturnType<typeof makeMockTransactionRepository>;
  let configService: ReturnType<typeof makeConfigService>;

  beforeEach(() => {
    repo = makeMockTransactionRepository();
    configService = makeConfigService();
    useCase = new HandleWebhookEventUseCase(repo, configService as unknown as ConfigService);
  });

  it('returns WebhookValidationFailedError when checksum is invalid', async () => {
    const result = await useCase.execute({ ...validInput, checksum: 'bad-checksum' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(WebhookValidationFailedError);
    expect(repo.findByProviderId).not.toHaveBeenCalled();
  });

  it('returns ok(void) when no local record matches providerId', async () => {
    repo.findByProviderId.mockResolvedValue(ok(null));

    const result = await useCase.execute(validInput);

    expect(result.ok).toBe(true);
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });

  it('updates local record when matching transaction exists', async () => {
    const tx = makeTransaction({ providerId: 'prov-123', status: 'PENDING' });
    repo.findByProviderId.mockResolvedValue(ok(tx));
    repo.updateStatus.mockResolvedValue(ok(makeTransaction({ status: 'APPROVED' })));

    const result = await useCase.execute(validInput);

    expect(result.ok).toBe(true);
    expect(repo.updateStatus).toHaveBeenCalledWith(tx.id, 'prov-123', 'APPROVED', null, {});
  });

  it('propagates infrastructure error from findByProviderId', async () => {
    const dbError = new InfrastructureError('DB_FAILED', new Error());
    repo.findByProviderId.mockResolvedValue(err(dbError));

    const result = await useCase.execute(validInput);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(dbError);
  });

  it('propagates infrastructure error from updateStatus', async () => {
    const tx = makeTransaction({ providerId: 'prov-123' });
    repo.findByProviderId.mockResolvedValue(ok(tx));
    const updateError = new InfrastructureError('UPDATE_FAILED', new Error());
    repo.updateStatus.mockResolvedValue(err(updateError));

    const result = await useCase.execute(validInput);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(updateError);
  });
});
