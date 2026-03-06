// @ts-nocheck
/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { TransactionController } from '@presentation/transaction/transaction.controller';
import { CreateTransactionUseCase } from '@application/transaction/use-cases/create-transaction.use-case';
import { GetTransactionStatusUseCase } from '@application/transaction/use-cases/get-transaction-status.use-case';
import { ok, err } from '@shared/result';
import { TransactionNotFoundError } from '@domain/transaction/errors/transaction-not-found.error';
import { DuplicateReferenceError } from '@domain/transaction/errors/duplicate-reference.error';
import { InvalidAmountError } from '@domain/transaction/errors/invalid-amount.error';
import { makeTransaction } from '../../../helpers/transaction.helper';

const ID = '11111111-2222-4333-8444-555555555555';

const createDto = {
  reference: 'order-ref-001',
  amountInCents: 10000,
  currency: 'COP',
  paymentMethod: 'CARD',
  paymentMethodDetails: { type: 'CARD', token: 'tok-abc' },
  customerEmail: 'customer@example.com',
  customerIp: null,
};

describe('TransactionController', () => {
  let controller: TransactionController;
  const mockCreate = { execute: jest.fn() };
  const mockGetStatus = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        { provide: CreateTransactionUseCase, useValue: mockCreate },
        { provide: GetTransactionStatusUseCase, useValue: mockGetStatus },
      ],
    }).compile();

    controller = module.get(TransactionController);
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('delegates to createTransactionUseCase and returns the DTO', async () => {
      const tx = makeTransaction();
      mockCreate.execute.mockResolvedValue(ok(tx));

      const result = await controller.create(createDto);

      expect(mockCreate.execute).toHaveBeenCalledWith(createDto);
      expect(result).toBe(tx);
    });

    it('throws ConflictException for DuplicateReferenceError', async () => {
      mockCreate.execute.mockResolvedValue(err(new DuplicateReferenceError('order-ref-001')));

      await expect(controller.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('throws UnprocessableEntityException for InvalidAmountError', async () => {
      mockCreate.execute.mockResolvedValue(err(new InvalidAmountError(0)));

      await expect(controller.create(createDto)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('getStatus()', () => {
    it('delegates to getTransactionStatusUseCase and returns the DTO', async () => {
      const tx = makeTransaction({ id: ID });
      mockGetStatus.execute.mockResolvedValue(ok(tx));

      const result = await controller.getStatus(ID);

      expect(mockGetStatus.execute).toHaveBeenCalledWith(ID);
      expect(result).toBe(tx);
    });

    it('throws NotFoundException when transaction is not found', async () => {
      mockGetStatus.execute.mockResolvedValue(err(new TransactionNotFoundError(ID)));

      await expect(controller.getStatus(ID)).rejects.toThrow(NotFoundException);
    });
  });
});
