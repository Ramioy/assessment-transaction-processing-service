// @ts-nocheck
/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { WebhookController } from '@presentation/webhook/webhook.controller';
import { HandleWebhookEventUseCase } from '@application/transaction/use-cases/handle-webhook-event.use-case';
import { ok, err } from '@shared/result';
import { WebhookValidationFailedError } from '@domain/transaction/errors/webhook-validation-failed.error';

const checksum = 'checksum-value';

const body = {
  data: {
    transaction: {
      id: 'prov-123',
      status: 'APPROVED',
      status_message: 'Payment approved',
    },
  },
  signature: {
    properties: ['transaction.id', 'transaction.status'],
  },
  timestamp: 1700000000,
};

describe('WebhookController', () => {
  let controller: WebhookController;
  const mockHandle = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [{ provide: HandleWebhookEventUseCase, useValue: mockHandle }],
    }).compile();

    controller = module.get(WebhookController);
    jest.clearAllMocks();
  });

  describe('handle()', () => {
    it('delegates to handleWebhookEventUseCase with mapped input', async () => {
      mockHandle.execute.mockResolvedValue(ok(undefined));

      await controller.handle(checksum, body);

      expect(mockHandle.execute).toHaveBeenCalledTimes(1);
      const calledInput = mockHandle.execute.mock.calls[0][0];
      expect(calledInput.checksum).toBe(checksum);
      expect(calledInput.timestamp).toBe(body.timestamp);
      expect(calledInput.data.providerId).toBe('prov-123');
      expect(calledInput.data.status).toBe('APPROVED');
      expect(calledInput.data.statusMessage).toBe('Payment approved');
    });

    it('extracts property values from nested data paths', async () => {
      mockHandle.execute.mockResolvedValue(ok(undefined));

      await controller.handle(checksum, body);

      const calledInput = mockHandle.execute.mock.calls[0][0];
      expect(calledInput.propertyValues).toEqual(['prov-123', 'APPROVED']);
    });

    it('throws UnauthorizedException for WebhookValidationFailedError', async () => {
      mockHandle.execute.mockResolvedValue(err(new WebhookValidationFailedError('checksum mismatch')));

      await expect(controller.handle(checksum, body)).rejects.toThrow(UnauthorizedException);
    });

    it('returns empty string when a nested property path resolves to undefined', async () => {
      mockHandle.execute.mockResolvedValue(ok(undefined));
      const bodyWithMissingProp = {
        ...body,
        signature: { properties: ['transaction.nonExistentField'] },
      };

      await controller.handle(checksum, bodyWithMissingProp);

      const calledInput = mockHandle.execute.mock.calls[0][0];
      expect(calledInput.propertyValues).toEqual(['']);
    });

    it('returns empty string when traversal hits a null intermediate node', async () => {
      mockHandle.execute.mockResolvedValue(ok(undefined));
      const bodyWithNull = {
        ...body,
        data: { transaction: null },
        signature: { properties: ['transaction.id'] },
      };

      await controller.handle(checksum, bodyWithNull);

      const calledInput = mockHandle.execute.mock.calls[0][0];
      expect(calledInput.propertyValues).toEqual(['']);
    });

    it('returns empty string when traversal hits a primitive intermediate node', async () => {
      mockHandle.execute.mockResolvedValue(ok(undefined));
      const bodyWithPrimitive = {
        ...body,
        data: { transaction: 'not-an-object' },
        signature: { properties: ['transaction.id'] },
      };

      await controller.handle(checksum, bodyWithPrimitive);

      const calledInput = mockHandle.execute.mock.calls[0][0];
      expect(calledInput.propertyValues).toEqual(['']);
    });

    it('handles missing transaction data gracefully', async () => {
      mockHandle.execute.mockResolvedValue(ok(undefined));
      const bodyNoTx = { ...body, data: {} };

      await controller.handle(checksum, bodyNoTx);

      const calledInput = mockHandle.execute.mock.calls[0][0];
      expect(calledInput.data.providerId).toBe('');
      expect(calledInput.data.status).toBe('');
      expect(calledInput.data.statusMessage).toBeNull();
    });
  });
});
