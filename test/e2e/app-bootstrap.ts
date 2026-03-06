/**
 * E2E Test Bootstrap
 * ─────────────────────────────────────────────────────────────
 * Creates a NestJS Fastify application wiring all controllers
 * and use cases directly, with both driven ports resolved to
 * jest mocks. No real HTTP clients or external services required.
 *
 * This tests the full HTTP layer:
 *   Fastify routing → NestJS controller → use case → mock port
 *   plus: ZodValidationPipe, HttpErrorFilter
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';

import { DI_TOKENS } from '@shared/di-tokens';
import { HttpErrorFilter } from '@shared/filters/http-exception.filter';

import { HealthController } from '@presentation/health/health.controller';
import { TransactionController } from '@presentation/transaction/transaction.controller';
import { TokenizationController } from '@presentation/tokenization/tokenization.controller';
import { MerchantController } from '@presentation/merchant/merchant.controller';
import { PseController } from '@presentation/pse/pse.controller';
import { WebhookController } from '@presentation/webhook/webhook.controller';

import { CreateTransactionUseCase } from '@application/transaction/use-cases/create-transaction.use-case';
import { GetTransactionStatusUseCase } from '@application/transaction/use-cases/get-transaction-status.use-case';
import { HandleWebhookEventUseCase } from '@application/transaction/use-cases/handle-webhook-event.use-case';
import { TokenizeCardUseCase } from '@application/transaction/use-cases/tokenize-card.use-case';
import { GetMerchantConfigUseCase } from '@application/transaction/use-cases/get-merchant-config.use-case';
import { ListPseInstitutionsUseCase } from '@application/transaction/use-cases/list-pse-institutions.use-case';

import { makeMockTransactionRepository, makeMockPaymentProviderPort } from '../helpers/mock-ports';

export interface TestPorts {
  transactionRepository: ReturnType<typeof makeMockTransactionRepository>;
  paymentProvider: ReturnType<typeof makeMockPaymentProviderPort>;
}

export interface BootstrapOptions {
  enableHealthCheck?: boolean;
}

function makeMockConfigService(enableHealthCheck: boolean): Partial<ConfigService> {
  const config: Record<string, unknown> = {
    ENABLE_HEALTH_CHECK: enableHealthCheck,
    PAYMENT_PROVIDER_INTEGRITY_KEY: 'test-integrity-key',
    PAYMENT_PROVIDER_EVENTS_KEY: 'test-events-key',
  };

  return {
    get: (key: string, defaultVal?: unknown) => (key in config ? config[key] : defaultVal) as any,
    getOrThrow: (key: string) => {
      if (!(key in config)) throw new Error(`Config key "${key}" not found in test config`);
      return config[key] as any;
    },
  };
}

export async function bootstrapTestApp(options: BootstrapOptions = {}): Promise<{
  app: NestFastifyApplication;
  ports: TestPorts;
}> {
  const { enableHealthCheck = true } = options;

  const ports: TestPorts = {
    transactionRepository: makeMockTransactionRepository(),
    paymentProvider: makeMockPaymentProviderPort(),
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    controllers: [
      HealthController,
      TransactionController,
      TokenizationController,
      MerchantController,
      PseController,
      WebhookController,
    ],
    providers: [
      { provide: DI_TOKENS.TRANSACTION_REPOSITORY, useValue: ports.transactionRepository },
      { provide: DI_TOKENS.PAYMENT_PROVIDER, useValue: ports.paymentProvider },
      { provide: ConfigService, useValue: makeMockConfigService(enableHealthCheck) },
      CreateTransactionUseCase,
      GetTransactionStatusUseCase,
      HandleWebhookEventUseCase,
      TokenizeCardUseCase,
      GetMerchantConfigUseCase,
      ListPseInstitutionsUseCase,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useGlobalFilters(new HttpErrorFilter());

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return { app, ports };
}
