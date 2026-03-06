import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentProviderConfig {
  readonly baseUrl: string;
  readonly publicKey: string;
  readonly privateKey: string;
  readonly eventsKey: string;
  readonly integrityKey: string;

  constructor(configService: ConfigService) {
    const environment = configService.get<string>('PAYMENT_PROVIDER_ENVIRONMENT', 'sandbox');

    this.baseUrl =
      environment === 'production'
        ? configService.getOrThrow<string>('PAYMENT_PROVIDER_PRODUCTION_URL')
        : configService.getOrThrow<string>('PAYMENT_PROVIDER_SANDBOX_URL');

    this.publicKey = configService.getOrThrow<string>('PAYMENT_PROVIDER_PUBLIC_KEY');
    this.privateKey = configService.getOrThrow<string>('PAYMENT_PROVIDER_PRIVATE_KEY');
    this.eventsKey = configService.getOrThrow<string>('PAYMENT_PROVIDER_EVENTS_KEY');
    this.integrityKey = configService.getOrThrow<string>('PAYMENT_PROVIDER_INTEGRITY_KEY');
  }
}
