// @ts-nocheck
/* eslint-disable */
import { TokenizeCardUseCase } from '@application/transaction/use-cases/tokenize-card.use-case';
import { TokenizationFailedError } from '@domain/transaction/errors/tokenization-failed.error';
import { InfrastructureError } from '@shared/errors/infrastructure.error';
import { ok, err } from '@shared/result';
import { makeMockPaymentProviderPort } from '../../../../helpers/mock-ports';

const cardData = {
  number: '4111111111111111',
  expMonth: '12',
  expYear: '2028',
  cvc: '123',
  cardHolder: 'John Doe',
};

describe('TokenizeCardUseCase', () => {
  let useCase: TokenizeCardUseCase;
  let provider: ReturnType<typeof makeMockPaymentProviderPort>;

  beforeEach(() => {
    provider = makeMockPaymentProviderPort();
    useCase = new TokenizeCardUseCase(provider);
  });

  it('delegates to provider.tokenizeCard and returns token response', async () => {
    const tokenResponse = {
      tokenId: 'tok-abc',
      brand: 'VISA',
      lastFour: '1111',
      expiresAt: '2028-12-31',
    };
    provider.tokenizeCard.mockResolvedValue(ok(tokenResponse));

    const result = await useCase.execute(cardData);

    expect(provider.tokenizeCard).toHaveBeenCalledWith(cardData);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(tokenResponse);
  });

  it('maps infrastructure error to TokenizationFailedError', async () => {
    const providerError = new InfrastructureError('card declined', new Error());
    provider.tokenizeCard.mockResolvedValue(err(providerError));

    const result = await useCase.execute(cardData);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(TokenizationFailedError);
      expect(result.error.reason).toBe('card declined');
    }
  });

  it('does not leak infrastructure error type to caller', async () => {
    provider.tokenizeCard.mockResolvedValue(err(new InfrastructureError('network', new Error())));

    const result = await useCase.execute(cardData);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).not.toBeInstanceOf(InfrastructureError);
  });
});
