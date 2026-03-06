// @ts-nocheck
/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

import { HealthController } from '@presentation/health/health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  const mockConfigService = { get: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    controller = module.get(HealthController);
    jest.clearAllMocks();
  });

  describe('check()', () => {
    it('returns status ok and a valid ISO timestamp when ENABLE_HEALTH_CHECK is true', () => {
      mockConfigService.get.mockReturnValue(true);

      const result = controller.check();

      expect(result.status).toBe('ok');
      expect(typeof result.timestamp).toBe('string');
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it('throws NotFoundException when ENABLE_HEALTH_CHECK is false', () => {
      mockConfigService.get.mockReturnValue(false);

      expect(() => controller.check()).toThrow(NotFoundException);
    });

    it('reads ENABLE_HEALTH_CHECK with a default of true', () => {
      mockConfigService.get.mockReturnValue(true);

      controller.check();

      expect(mockConfigService.get).toHaveBeenCalledWith('ENABLE_HEALTH_CHECK', true);
    });
  });
});
