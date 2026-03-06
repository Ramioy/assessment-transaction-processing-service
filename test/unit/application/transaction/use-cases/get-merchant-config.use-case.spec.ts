// @ts-nocheck
/* eslint-disable */
import { GetMerchantConfigUseCase } from '@application/transaction/use-cases/get-merchant-config.use-case';
import { InfrastructureError } from '@shared/errors/infrastructure.error';
import { ok, err } from '@shared/result';
import { makeMockPaymentProviderPort } from '../../../../helpers/mock-ports';

describe('GetMerchantConfigUseCase', () => {
  let useCase: GetMerchantConfigUseCase;
  let provider: ReturnType<typeof makeMockPaymentProviderPort>;

  beforeEach(() => {
    provider = makeMockPaymentProviderPort();
    useCase = new GetMerchantConfigUseCase(provider);
  });

  it('delegates to provider.getMerchantConfig and returns the result', async () => {
    const config = {
      acceptanceToken: 'tok-abc',
      presignedAcceptance: {
        acceptanceToken: 'tok-abc',
        permalink: 'https://example.com/terms',
        type: 'END_USER_POLICY',
      },
      paymentMethods: ['CARD', 'NEQUI'],
    };
    provider.getMerchantConfig.mockResolvedValue(ok(config));

    const result = await useCase.execute();

    expect(provider.getMerchantConfig).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(config);
  });

  it('propagates infrastructure error from provider', async () => {
    const providerError = new InfrastructureError('PROVIDER_FAILED', new Error());
    provider.getMerchantConfig.mockResolvedValue(err(providerError));

    const result = await useCase.execute();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(providerError);
  });
});
