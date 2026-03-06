// @ts-nocheck
/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { PseController } from '@presentation/pse/pse.controller';
import { ListPseInstitutionsUseCase } from '@application/transaction/use-cases/list-pse-institutions.use-case';
import { ok, err } from '@shared/result';
import { InfrastructureError } from '@shared/errors/infrastructure.error';

describe('PseController', () => {
  let controller: PseController;
  const mockList = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PseController],
      providers: [{ provide: ListPseInstitutionsUseCase, useValue: mockList }],
    }).compile();

    controller = module.get(PseController);
    jest.clearAllMocks();
  });

  describe('listInstitutions()', () => {
    it('delegates to listPseInstitutionsUseCase and returns the list', async () => {
      const institutions = [
        { financialInstitutionCode: '1', name: 'Banco A' },
        { financialInstitutionCode: '2', name: 'Banco B' },
      ];
      mockList.execute.mockResolvedValue(ok(institutions));

      const result = await controller.listInstitutions();

      expect(mockList.execute).toHaveBeenCalledTimes(1);
      expect(result).toBe(institutions);
    });

    it('returns empty array when no institutions exist', async () => {
      mockList.execute.mockResolvedValue(ok([]));

      const result = await controller.listInstitutions();

      expect(result).toEqual([]);
    });

    it('throws InternalServerErrorException when provider is unreachable', async () => {
      mockList.execute.mockResolvedValue(
        err(new InfrastructureError('PROVIDER_FAILED', new Error())),
      );

      await expect(controller.listInstitutions()).rejects.toThrow(InternalServerErrorException);
    });
  });
});
