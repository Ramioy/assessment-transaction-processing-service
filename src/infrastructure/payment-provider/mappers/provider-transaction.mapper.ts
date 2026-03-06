import type { PaymentMethod } from '@domain/payment-method/payment-method.value-object';
import type {
  MerchantConfigDto,
  ProviderStatusResponseDto,
  ProviderTransactionResponseDto,
  PseInstitutionDto,
  TokenResponseDto,
} from '@application/transaction/ports/payment-provider.port';

export class ProviderTransactionMapper {
  // ── Response mappers (provider JSON → domain DTOs) ────────────

  static toTokenResponse(raw: unknown): TokenResponseDto {
    const data = (raw as { data: Record<string, unknown> }).data;
    return {
      tokenId: data.id as string,
      brand: data.brand as string,
      lastFour: data.last_four as string,
      expiresAt: `${data.exp_month as string}/${data.exp_year as string}`,
    };
  }

  static toProviderTransactionResponse(raw: unknown): ProviderTransactionResponseDto {
    const data = (raw as { data: Record<string, unknown> }).data;
    return {
      providerId: data.id as string,
      status: data.status as string,
      statusMessage: (data.status_message as string | null) ?? null,
      raw: data,
    };
  }

  static toProviderStatusResponse(raw: unknown): ProviderStatusResponseDto {
    const data = (raw as { data: Record<string, unknown> }).data;
    return {
      status: data.status as string,
      statusMessage: (data.status_message as string | null) ?? null,
      raw: data,
    };
  }

  static toMerchantConfig(raw: unknown): MerchantConfigDto {
    const data = (raw as { data: Record<string, unknown> }).data;
    const presigned = data.presigned_acceptance as Record<string, unknown>;
    const methods = data.payment_methods as Array<Record<string, unknown>>;
    return {
      acceptanceToken: presigned.acceptance_token as string,
      presignedAcceptance: {
        acceptanceToken: presigned.acceptance_token as string,
        permalink: presigned.permalink as string,
        type: presigned.type as string,
      },
      paymentMethods: methods.map((m) => m.name as string),
    };
  }

  static toPseInstitution(raw: Record<string, unknown>): PseInstitutionDto {
    return {
      financialInstitutionCode: raw.financial_institution_code as string,
      name: raw.name as string,
    };
  }

  // ── Request mapper (domain PaymentMethod → provider snake_case) ─

  static toProviderPaymentMethod(pm: PaymentMethod): Record<string, unknown> {
    switch (pm.type) {
      case 'CARD':
        return { type: 'CARD', token: pm.token, installments: pm.installments };
      case 'NEQUI':
        return { type: 'NEQUI', phone_number: pm.phoneNumber };
      case 'PSE':
        return {
          type: 'PSE',
          user_type: pm.userType,
          user_legal_id_type: pm.userLegalIdType,
          user_legal_id: pm.userLegalId,
          financial_institution_code: pm.financialInstitutionCode,
          payment_description: pm.paymentDescription,
        };
      case 'BANCOLOMBIA_TRANSFER':
        return {
          type: 'BANCOLOMBIA_TRANSFER',
          user_type: pm.userType,
          payment_description: pm.paymentDescription,
        };
      case 'BANCOLOMBIA_QR':
        return { type: 'BANCOLOMBIA_QR' };
    }
  }
}
