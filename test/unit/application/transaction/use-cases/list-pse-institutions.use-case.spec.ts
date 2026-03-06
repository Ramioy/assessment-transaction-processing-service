// @ts-nocheck
/* eslint-disable */
import { ListPseInstitutionsUseCase } from '@application/transaction/use-cases/list-pse-institutions.use-case';
import { InfrastructureError } from '@shared/errors/infrastructure.error';
import { ok, err } from '@shared/result';
import { makeMockPaymentProviderPort } from '../../../../helpers/mock-ports';

describe('ListPseInstitutionsUseCase', () => {
  let useCase: ListPseInstitutionsUseCase;
  let provider: ReturnType<typeof makeMockPaymentProviderPort>;

  beforeEach(() => {
    provider = makeMockPaymentProviderPort();
    useCase = new ListPseInstitutionsUseCase(provider);
  });

  it('delegates to provider.listPseInstitutions and returns the result', async () => {
    const institutions = [
      { financialInstitutionCode: '1', name: 'Banco A' },
      { financialInstitutionCode: '2', name: 'Banco B' },
    ];
    provider.listPseInstitutions.mockResolvedValue(ok(institutions));

    const result = await useCase.execute();

    expect(provider.listPseInstitutions).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(institutions);
  });

  it('returns empty array when no institutions are available', async () => {
    provider.listPseInstitutions.mockResolvedValue(ok([]));

    const result = await useCase.execute();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual([]);
  });

  it('propagates infrastructure error from provider', async () => {
    const providerError = new InfrastructureError('PROVIDER_FAILED', new Error());
    provider.listPseInstitutions.mockResolvedValue(err(providerError));

    const result = await useCase.execute();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(providerError);
  });
});
