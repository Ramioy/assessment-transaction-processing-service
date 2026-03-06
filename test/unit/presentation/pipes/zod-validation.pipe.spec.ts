// @ts-nocheck
/* eslint-disable */
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '@presentation/pipes/zod-validation.pipe';

const schema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
});

describe('ZodValidationPipe', () => {
  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(schema);
  });

  it('returns parsed value when input is valid', () => {
    const input = { name: 'Alice', age: 30 };
    expect(pipe.transform(input)).toEqual(input);
  });

  it('throws BadRequestException when input is invalid', () => {
    expect(() => pipe.transform({ name: '', age: -1 })).toThrow(BadRequestException);
  });

  it('includes validation errors in the exception response', () => {
    try {
      pipe.transform({ name: '', age: 'not-a-number' });
    } catch (e) {
      const response = e.getResponse();
      expect(response.message).toBe('Validation failed');
      expect(Array.isArray(response.errors)).toBe(true);
      expect(response.errors.length).toBeGreaterThan(0);
    }
  });

  it('throws BadRequestException for a completely invalid payload', () => {
    expect(() => pipe.transform(null)).toThrow(BadRequestException);
  });

  it('strips unknown fields (zod strips by default)', () => {
    const result = pipe.transform({ name: 'Bob', age: 25, extra: 'ignored' });
    expect(result).not.toHaveProperty('extra');
  });
});
