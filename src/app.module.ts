import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { envValidationSchema } from '@infrastructure/config/env-validation';
import { ApiKeyGuard } from '@shared/guards/api-key.guard';
import { HealthModule } from './modules/health.module';
import { TransactionModule } from './modules/transaction.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? 'environment/production/.env'
          : 'environment/development/.env',
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    HealthModule,
    TransactionModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
