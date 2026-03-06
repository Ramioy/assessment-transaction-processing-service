// @ts-nocheck
/* eslint-disable */
import { generateIntegritySignature } from '@shared/crypto/integrity-signature';

describe('generateIntegritySignature', () => {
  it('returns a 64-character hex string', () => {
    const sig = generateIntegritySignature('ref-001', 10000, 'COP', 'key');
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces a deterministic output for the same inputs', () => {
    const sig1 = generateIntegritySignature('order-ref-001', 10000, 'COP', 'test-key');
    const sig2 = generateIntegritySignature('order-ref-001', 10000, 'COP', 'test-key');
    expect(sig1).toBe(sig2);
  });

  it('matches the pre-computed SHA-256 of reference+amount+currency+key', () => {
    const expected = '2232cc6703cc942dbbf98540e036b2fe6237ec604606f15d89094374665432d2';
    expect(generateIntegritySignature('order-ref-001', 10000, 'COP', 'test-key')).toBe(expected);
  });

  it('produces different signatures for different references', () => {
    const sig1 = generateIntegritySignature('ref-A', 10000, 'COP', 'key');
    const sig2 = generateIntegritySignature('ref-B', 10000, 'COP', 'key');
    expect(sig1).not.toBe(sig2);
  });

  it('produces different signatures for different amounts', () => {
    const sig1 = generateIntegritySignature('ref', 10000, 'COP', 'key');
    const sig2 = generateIntegritySignature('ref', 20000, 'COP', 'key');
    expect(sig1).not.toBe(sig2);
  });

  it('produces different signatures for different integrity keys', () => {
    const sig1 = generateIntegritySignature('ref', 10000, 'COP', 'key-A');
    const sig2 = generateIntegritySignature('ref', 10000, 'COP', 'key-B');
    expect(sig1).not.toBe(sig2);
  });
});
