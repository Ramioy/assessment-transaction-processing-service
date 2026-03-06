import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DbDomainServiceConfig {
  readonly baseUrl: string;
  readonly apiKey: string;

  constructor(configService: ConfigService) {
    this.baseUrl = configService.getOrThrow<string>('DB_DOMAIN_SERVICE_URL');
    this.apiKey = configService.getOrThrow<string>('DB_DOMAIN_SERVICE_API_KEY');
  }
}
