import { createHash } from 'node:crypto';

export const generateIntegritySignature = (
  reference: string,
  amountInCents: number,
  currency: string,
  integrityKey: string,
): string => {
  const raw = `${reference}${amountInCents}${currency}${integrityKey}`;
  return createHash('sha256').update(raw).digest('hex');
};
