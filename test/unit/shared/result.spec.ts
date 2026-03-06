// @ts-nocheck
/* eslint-disable */
import {
  ok,
  err,
  isOk,
  isErr,
  map,
  flatMap,
  mapErr,
  asyncFlatMap,
  fromThrowable,
  fromPromise,
} from '@shared/result';

describe('Result utilities', () => {
  describe('ok()', () => {
    it('creates a Success result with the given value', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });

    it('works with any value type', () => {
      const obj = { id: 1 };
      expect(ok(obj).value).toBe(obj);
    });
  });

  describe('err()', () => {
    it('creates a Failure result with the given error', () => {
      const error = new Error('oops');
      const result = err(error);
      expect(result.ok).toBe(false);
      expect(result.error).toBe(error);
    });

    it('works with any error type', () => {
      expect(err('string-error').error).toBe('string-error');
    });
  });

  describe('isOk()', () => {
    it('returns true for a Success result', () => {
      expect(isOk(ok(1))).toBe(true);
    });

    it('returns false for a Failure result', () => {
      expect(isOk(err(new Error()))).toBe(false);
    });
  });

  describe('isErr()', () => {
    it('returns true for a Failure result', () => {
      expect(isErr(err(new Error()))).toBe(true);
    });

    it('returns false for a Success result', () => {
      expect(isErr(ok(1))).toBe(false);
    });
  });

  describe('map()', () => {
    it('applies fn and wraps result when result is ok', () => {
      const result = map(ok(2), (x) => x * 3);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(6);
    });

    it('passes through the failure when result is err', () => {
      const error = new Error('fail');
      const result = map(err(error), (x: number) => x * 3);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe(error);
    });
  });

  describe('flatMap()', () => {
    it('applies fn when result is ok', () => {
      const result = flatMap(ok(5), (x) => ok(x + 1));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(6);
    });

    it('can return err from fn when result is ok', () => {
      const result = flatMap(ok(5), (_) => err(new Error('inner fail')));
      expect(result.ok).toBe(false);
    });

    it('passes through the failure when result is err', () => {
      const error = new Error('fail');
      const fn = jest.fn();
      const result = flatMap(err(error), fn);
      expect(fn).not.toHaveBeenCalled();
      if (!result.ok) expect(result.error).toBe(error);
    });
  });

  describe('mapErr()', () => {
    it('passes through when result is ok', () => {
      const result = mapErr(ok(42), (_) => new Error('mapped'));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(42);
    });

    it('applies fn to error when result is err', () => {
      const mapped = new Error('mapped');
      const result = mapErr(err(new Error('original')), (_) => mapped);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe(mapped);
    });
  });

  describe('asyncFlatMap()', () => {
    it('applies async fn when result is ok', async () => {
      const result = await asyncFlatMap(ok(3), async (x) => ok(x * 2));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(6);
    });

    it('passes through the failure when result is err', async () => {
      const error = new Error('fail');
      const fn = jest.fn();
      const result = await asyncFlatMap(err(error), fn);
      expect(fn).not.toHaveBeenCalled();
      if (!result.ok) expect(result.error).toBe(error);
    });
  });

  describe('fromThrowable()', () => {
    it('returns ok when fn does not throw', () => {
      const result = fromThrowable(() => 'success', (e) => new Error(String(e)));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('success');
    });

    it('returns err when fn throws', () => {
      const mapped = new Error('caught');
      const result = fromThrowable(() => { throw new Error('boom'); }, (_) => mapped);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe(mapped);
    });
  });

  describe('fromPromise()', () => {
    it('returns ok when promise resolves', async () => {
      const result = await fromPromise(Promise.resolve(99), (e) => new Error(String(e)));
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(99);
    });

    it('returns err when promise rejects', async () => {
      const mapped = new Error('rejected');
      const result = await fromPromise(Promise.reject(new Error('boom')), (_) => mapped);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe(mapped);
    });
  });
});
