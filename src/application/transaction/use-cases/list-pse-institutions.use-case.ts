import { Injectable, Inject } from '@nestjs/common';

import { DI_TOKENS } from '@shared/di-tokens';
import type { Result } from '@shared/result';
import type { InfrastructureError } from '@shared/errors/infrastructure.error';
import type {
  PaymentProviderPort,
  PseInstitutionDto,
} from '@application/transaction/ports/payment-provider.port';

@Injectable()
export class ListPseInstitutionsUseCase {
  constructor(
    @Inject(DI_TOKENS.PAYMENT_PROVIDER)
    private readonly provider: PaymentProviderPort,
  ) {}

  async execute(): Promise<Result<PseInstitutionDto[], InfrastructureError>> {
    return this.provider.listPseInstitutions();
  }
}
