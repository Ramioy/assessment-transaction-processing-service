import { createHash, timingSafeEqual } from 'node:crypto';

export const validateWebhookChecksum = (
  propertyValues: string[],
  timestamp: number,
  eventsKey: string,
  receivedChecksum: string,
): boolean => {
  const raw = [...propertyValues, String(timestamp), eventsKey].join('');
  const computed = createHash('sha256').update(raw).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(computed, 'utf8'), Buffer.from(receivedChecksum, 'utf8'));
  } catch {
    return false;
  }
};
