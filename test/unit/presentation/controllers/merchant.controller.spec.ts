// @ts-nocheck
/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { MerchantController } from '@presentation/merchant/merchant.controller';
import { GetMerchantConfigUseCase } from '@application/transaction/use-cases/get-merchant-config.use-case';
import { ok, err } from '@shared/result';
import { InfrastructureError } from '@shared/errors/infrastructure.error';

const merchantConfig = {
  acceptanceToken: 'tok-abc',
  presignedAcceptance: {
    acceptanceToken: 'tok-abc',
    permalink: 'https://example.com/terms',
    type: 'END_USER_POLICY',
  },
  paymentMethods: ['CARD', 'NEQUI'],
};

describe('MerchantController', () => {
  let controller: MerchantController;
  const mockGetConfig = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantController],
      providers: [{ provide: GetMerchantConfigUseCase, useValue: mockGetConfig }],
    }).compile();

    controller = module.get(MerchantController);
    jest.clearAllMocks();
  });

  describe('getConfig()', () => {
    it('delegates to getMerchantConfigUseCase and returns the config', async () => {
      mockGetConfig.execute.mockResolvedValue(ok(merchantConfig));

      const result = await controller.getConfig();

      expect(mockGetConfig.execute).toHaveBeenCalledTimes(1);
      expect(result).toBe(merchantConfig);
    });

    it('throws InternalServerErrorException when provider is unreachable', async () => {
      mockGetConfig.execute.mockResolvedValue(
        err(new InfrastructureError('PROVIDER_FAILED', new Error())),
      );

      await expect(controller.getConfig()).rejects.toThrow(InternalServerErrorException);
    });
  });
});
