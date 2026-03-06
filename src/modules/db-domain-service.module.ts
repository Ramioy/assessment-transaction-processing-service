import { Module } from '@nestjs/common';

import { DI_TOKENS } from '@shared/di-tokens';
import { DbDomainServiceConfig } from '@infrastructure/db-domain-service/db-domain-service.config';
import { DbDomainServiceAdapter } from '@infrastructure/db-domain-service/db-domain-service.adapter';

@Module({
  providers: [
    DbDomainServiceConfig,
    {
      provide: DI_TOKENS.TRANSACTION_REPOSITORY,
      useClass: DbDomainServiceAdapter,
    },
  ],
  exports: [DI_TOKENS.TRANSACTION_REPOSITORY],
})
export class DbDomainServiceModule {}
