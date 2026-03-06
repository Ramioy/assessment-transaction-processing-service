import { z } from 'zod';

// ── CARD ──────────────────────────────────────────────────────

export const cardPaymentMethodSchema = z.object({
  type: z.literal('CARD'),
  token: z.string().min(1),
  installments: z.number().int().min(1).default(1),
});

// ── NEQUI ─────────────────────────────────────────────────────

export const nequiPaymentMethodSchema = z.object({
  type: z.literal('NEQUI'),
  phoneNumber: z.string().min(10).max(10),
});

// ── PSE ───────────────────────────────────────────────────────

export const psePaymentMethodSchema = z.object({
  type: z.literal('PSE'),
  userType: z.number().int().min(0).max(1),
  userLegalIdType: z.string().min(1),
  userLegalId: z.string().min(1),
  financialInstitutionCode: z.string().min(1),
  paymentDescription: z.string().min(1),
});

// ── BANCOLOMBIA_TRANSFER ──────────────────────────────────────

export const bancolombiaTransferPaymentMethodSchema = z.object({
  type: z.literal('BANCOLOMBIA_TRANSFER'),
  userType: z.number().int().min(0).max(1),
  paymentDescription: z.string().min(1),
});

// ── BANCOLOMBIA_QR ────────────────────────────────────────────

export const bancolombiaQrPaymentMethodSchema = z.object({
  type: z.literal('BANCOLOMBIA_QR'),
});

// ── Discriminated union ───────────────────────────────────────

export const paymentMethodSchema = z.discriminatedUnion('type', [
  cardPaymentMethodSchema,
  nequiPaymentMethodSchema,
  psePaymentMethodSchema,
  bancolombiaTransferPaymentMethodSchema,
  bancolombiaQrPaymentMethodSchema,
]);

export type CardPaymentMethod = z.infer<typeof cardPaymentMethodSchema>;
export type NequiPaymentMethod = z.infer<typeof nequiPaymentMethodSchema>;
export type PsePaymentMethod = z.infer<typeof psePaymentMethodSchema>;
export type BancolombiaTransferPaymentMethod = z.infer<typeof bancolombiaTransferPaymentMethodSchema>;
export type BancolombiaQrPaymentMethod = z.infer<typeof bancolombiaQrPaymentMethodSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
