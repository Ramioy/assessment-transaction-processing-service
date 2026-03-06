// @ts-nocheck
/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException } from '@nestjs/common';
import { TokenizationController } from '@presentation/tokenization/tokenization.controller';
import { TokenizeCardUseCase } from '@application/transaction/use-cases/tokenize-card.use-case';
import { ok, err } from '@shared/result';
import { TokenizationFailedError } from '@domain/transaction/errors/tokenization-failed.error';

const cardDto = {
  number: '4111111111111111',
  expMonth: '12',
  expYear: '2028',
  cvc: '123',
  cardHolder: 'John Doe',
};

describe('TokenizationController', () => {
  let controller: TokenizationController;
  const mockTokenize = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TokenizationController],
      providers: [{ provide: TokenizeCardUseCase, useValue: mockTokenize }],
    }).compile();

    controller = module.get(TokenizationController);
    jest.clearAllMocks();
  });

  describe('tokenize()', () => {
    it('delegates to tokenizeCardUseCase and returns the token response', async () => {
      const tokenResponse = { tokenId: 'tok-abc', brand: 'VISA', lastFour: '1111', expiresAt: '2028-12-31' };
      mockTokenize.execute.mockResolvedValue(ok(tokenResponse));

      const result = await controller.tokenize(cardDto);

      expect(mockTokenize.execute).toHaveBeenCalledWith(cardDto);
      expect(result).toBe(tokenResponse);
    });

    it('throws BadGatewayException for TokenizationFailedError', async () => {
      mockTokenize.execute.mockResolvedValue(err(new TokenizationFailedError('card declined')));

      await expect(controller.tokenize(cardDto)).rejects.toThrow(BadGatewayException);
    });
  });
});
