import { Module } from '@nestjs/common';

import { DI_TOKENS } from '@shared/di-tokens';
import { PaymentProviderConfig } from '@infrastructure/payment-provider/payment-provider.config';
import { PaymentProviderAdapter } from '@infrastructure/payment-provider/payment-provider.adapter';

@Module({
  providers: [
    PaymentProviderConfig,
    {
      provide: DI_TOKENS.PAYMENT_PROVIDER,
      useClass: PaymentProviderAdapter,
    },
  ],
  exports: [DI_TOKENS.PAYMENT_PROVIDER],
})
export class PaymentProviderModule {}
