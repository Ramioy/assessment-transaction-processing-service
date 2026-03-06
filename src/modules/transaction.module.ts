import { Module } from '@nestjs/common';

import { DbDomainServiceModule } from './db-domain-service.module';
import { PaymentProviderModule } from './payment-provider.module';
import { TokenizationController } from '@presentation/tokenization/tokenization.controller';
import { TransactionController } from '@presentation/transaction/transaction.controller';
import { WebhookController } from '@presentation/webhook/webhook.controller';
import { MerchantController } from '@presentation/merchant/merchant.controller';
import { PseController } from '@presentation/pse/pse.controller';
import { TokenizeCardUseCase } from '@application/transaction/use-cases/tokenize-card.use-case';
import { CreateTransactionUseCase } from '@application/transaction/use-cases/create-transaction.use-case';
import { GetTransactionStatusUseCase } from '@application/transaction/use-cases/get-transaction-status.use-case';
import { HandleWebhookEventUseCase } from '@application/transaction/use-cases/handle-webhook-event.use-case';
import { ListPseInstitutionsUseCase } from '@application/transaction/use-cases/list-pse-institutions.use-case';
import { GetMerchantConfigUseCase } from '@application/transaction/use-cases/get-merchant-config.use-case';

@Module({
  imports: [DbDomainServiceModule, PaymentProviderModule],
  controllers: [
    TokenizationController,
    TransactionController,
    WebhookController,
    MerchantController,
    PseController,
  ],
  providers: [
    TokenizeCardUseCase,
    CreateTransactionUseCase,
    GetTransactionStatusUseCase,
    HandleWebhookEventUseCase,
    ListPseInstitutionsUseCase,
    GetMerchantConfigUseCase,
  ],
})
export class TransactionModule {}
