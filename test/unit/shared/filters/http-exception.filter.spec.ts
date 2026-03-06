// @ts-nocheck
/* eslint-disable */
import { HttpException, HttpStatus, ArgumentsHost, Logger } from '@nestjs/common';
import { HttpErrorFilter } from '@shared/filters/http-exception.filter';

function makeReply(sent = false) {
  return {
    sent,
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
}

function makeArgumentsHost(reply: ReturnType<typeof makeReply>): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => reply,
      getRequest: () => ({}),
      getNext: () => jest.fn(),
    }),
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: () => 'http',
  } as unknown as ArgumentsHost;
}

describe('HttpErrorFilter', () => {
  let filter: HttpErrorFilter;

  beforeEach(() => {
    filter = new HttpErrorFilter();
  });

  it('handles HttpException with correct status and string message', () => {
    const reply = makeReply();
    filter.catch(new HttpException('Not Found', HttpStatus.NOT_FOUND), makeArgumentsHost(reply));

    expect(reply.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Not Found' }),
    );
  });

  it('handles HttpException with object response body', () => {
    const reply = makeReply();
    filter.catch(
      new HttpException({ message: 'Bad input', errors: [] }, HttpStatus.BAD_REQUEST),
      makeArgumentsHost(reply),
    );

    expect(reply.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const sent = reply.send.mock.calls[0][0];
    expect(sent.statusCode).toBe(400);
  });

  it('handles unknown Error with 500 status', () => {
    const reply = makeReply();
    filter.catch(new Error('Unexpected'), makeArgumentsHost(reply));

    expect(reply.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'Unexpected' }),
    );
  });

  it('includes timestamp in the response', () => {
    const reply = makeReply();
    filter.catch(new Error('err'), makeArgumentsHost(reply));

    const sent = reply.send.mock.calls[0][0];
    expect(typeof sent.timestamp).toBe('string');
    expect(() => new Date(sent.timestamp)).not.toThrow();
  });

  it('handles non-Error primitives gracefully', () => {
    const reply = makeReply();
    filter.catch('some string error', makeArgumentsHost(reply));

    expect(reply.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('calls logger.warn for 4xx HttpException with string message', () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const reply = makeReply();

    filter.catch(new HttpException('Not Found', HttpStatus.NOT_FOUND), makeArgumentsHost(reply));

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('404'));
    warnSpy.mockRestore();
  });

  it('logs stringified object message for 5xx HttpException with object response', () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const reply = makeReply();

    filter.catch(
      new HttpException(
        { message: 'Service unavailable', code: 'INFRA_ERR' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      ),
      makeArgumentsHost(reply),
    );

    expect(reply.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('500'),
      expect.any(String),
    );
    errorSpy.mockRestore();
  });

  it('does not call reply when already sent', () => {
    const reply = makeReply(true);
    filter.catch(new Error('err'), makeArgumentsHost(reply));

    expect(reply.send).not.toHaveBeenCalled();
  });
});
