// @ts-nocheck
/* eslint-disable */
import { validateWebhookChecksum } from '@shared/crypto/webhook-checksum';

describe('validateWebhookChecksum', () => {
  const PROPERTY_VALUES = ['APPROVED', 'order-ref-001', '10000'];
  const TIMESTAMP = 1700000000;
  const EVENTS_KEY = 'events-key';
  // Pre-computed: SHA-256('APPROVEDorder-ref-0011000017000000000events-key')
  const VALID_CHECKSUM = 'c2e840569486016e24013b01761a9b5630c2a9f2bb7c650251ce15fefb3a68f8';

  it('returns true for a valid checksum', () => {
    expect(validateWebhookChecksum(PROPERTY_VALUES, TIMESTAMP, EVENTS_KEY, VALID_CHECKSUM)).toBe(
      true,
    );
  });

  it('returns false for a tampered checksum', () => {
    const tampered = VALID_CHECKSUM.replace('c2', 'ff');
    expect(validateWebhookChecksum(PROPERTY_VALUES, TIMESTAMP, EVENTS_KEY, tampered)).toBe(false);
  });

  it('returns false when the events key differs', () => {
    expect(
      validateWebhookChecksum(PROPERTY_VALUES, TIMESTAMP, 'wrong-key', VALID_CHECKSUM),
    ).toBe(false);
  });

  it('returns false when the timestamp differs', () => {
    expect(
      validateWebhookChecksum(PROPERTY_VALUES, TIMESTAMP + 1, EVENTS_KEY, VALID_CHECKSUM),
    ).toBe(false);
  });

  it('returns false when property values differ', () => {
    expect(
      validateWebhookChecksum(['DECLINED', 'order-ref-001', '10000'], TIMESTAMP, EVENTS_KEY, VALID_CHECKSUM),
    ).toBe(false);
  });

  it('returns false for a checksum of wrong length', () => {
    expect(validateWebhookChecksum(PROPERTY_VALUES, TIMESTAMP, EVENTS_KEY, 'short')).toBe(false);
  });
});
