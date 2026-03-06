// @ts-nocheck
/* eslint-disable */
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from '@shared/interceptors/logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  const makeContext = (method = 'GET', url = '/api/test', statusCode = 200) => ({
    switchToHttp: () => ({
      getRequest: () => ({ method, url }),
      getResponse: () => ({ statusCode }),
    }),
  });

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs successful requests with method, url, status, and elapsed time', (done) => {
    const context = makeContext('GET', '/api/test', 200);
    const next = { handle: () => of({ data: 'ok' }) };

    interceptor.intercept(context as any, next as any).subscribe({
      next: (value) => {
        expect(value).toEqual({ data: 'ok' });
        expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/GET \/api\/test 200 - \d+ms/));
        done();
      },
    });
  });

  it('logs errors and rethrows them', (done) => {
    const context = makeContext('POST', '/api/fail', 500);
    const error = new Error('Something went wrong');
    const next = { handle: () => throwError(() => error) };

    interceptor.intercept(context as any, next as any).subscribe({
      error: (err) => {
        expect(err).toBe(error);
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringMatching(/POST \/api\/fail ERROR - \d+ms/),
        );
        done();
      },
    });
  });

  it('passes through the response value from next.handle()', (done) => {
    const context = makeContext();
    const payload = { id: 42 };
    const next = { handle: () => of(payload) };

    interceptor.intercept(context as any, next as any).subscribe({
      next: (value) => {
        expect(value).toBe(payload);
        done();
      },
    });
  });
});
