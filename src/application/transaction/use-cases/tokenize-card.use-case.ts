import { Injectable, Inject } from '@nestjs/common';

import { DI_TOKENS } from '@shared/di-tokens';
import { mapErr, type Result } from '@shared/result';
import { TokenizationFailedError } from '@domain/transaction/errors';
import type {
  PaymentProviderPort,
  CardTokenizationDto,
  TokenResponseDto,
} from '@application/transaction/ports/payment-provider.port';

@Injectable()
export class TokenizeCardUseCase {
  constructor(
    @Inject(DI_TOKENS.PAYMENT_PROVIDER)
    private readonly provider: PaymentProviderPort,
  ) {}

  async execute(
    dto: CardTokenizationDto,
  ): Promise<Result<TokenResponseDto, TokenizationFailedError>> {
    return mapErr(
      await this.provider.tokenizeCard(dto),
      (e) => new TokenizationFailedError(e.reason),
    );
  }
}
