// @ts-nocheck
/* eslint-disable */
import {
  BadGatewayException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { unwrapResult } from '@presentation/helpers/result-to-response.helper';
import { ok, err } from '@shared/result';
import { InfrastructureError } from '@shared/errors/infrastructure.error';
import { TransactionNotFoundError } from '@domain/transaction/errors/transaction-not-found.error';
import { DuplicateReferenceError } from '@domain/transaction/errors/duplicate-reference.error';
import { InvalidAmountError } from '@domain/transaction/errors/invalid-amount.error';
import { InvalidPaymentMethodError } from '@domain/transaction/errors/invalid-payment-method.error';
import { TokenizationFailedError } from '@domain/transaction/errors/tokenization-failed.error';
import { TransactionCreationFailedError } from '@domain/transaction/errors/transaction-creation-failed.error';
import { WebhookValidationFailedError } from '@domain/transaction/errors/webhook-validation-failed.error';

describe('unwrapResult', () => {
  it('returns the value when result is ok', () => {
    const value = { id: 'abc' };
    expect(unwrapResult(ok(value))).toBe(value);
  });

  it('throws NotFoundException for TransactionNotFoundError', () => {
    expect(() => unwrapResult(err(new TransactionNotFoundError('abc')))).toThrow(NotFoundException);
  });

  it('throws ConflictException for DuplicateReferenceError', () => {
    expect(() => unwrapResult(err(new DuplicateReferenceError('ref-001')))).toThrow(
      ConflictException,
    );
  });

  it('throws UnprocessableEntityException for InvalidAmountError', () => {
    expect(() => unwrapResult(err(new InvalidAmountError(0)))).toThrow(
      UnprocessableEntityException,
    );
  });

  it('throws UnprocessableEntityException for InvalidPaymentMethodError', () => {
    expect(() => unwrapResult(err(new InvalidPaymentMethodError('WIRE')))).toThrow(
      UnprocessableEntityException,
    );
  });

  it('throws BadGatewayException for TokenizationFailedError', () => {
    expect(() => unwrapResult(err(new TokenizationFailedError('network')))).toThrow(
      BadGatewayException,
    );
  });

  it('throws BadGatewayException for TransactionCreationFailedError', () => {
    expect(() => unwrapResult(err(new TransactionCreationFailedError('timeout')))).toThrow(
      BadGatewayException,
    );
  });

  it('throws UnauthorizedException for WebhookValidationFailedError', () => {
    expect(() => unwrapResult(err(new WebhookValidationFailedError('checksum')))).toThrow(
      UnauthorizedException,
    );
  });

  it('throws InternalServerErrorException for InfrastructureError', () => {
    expect(() => unwrapResult(err(new InfrastructureError('DB_FAILED', new Error())))).toThrow(
      InternalServerErrorException,
    );
  });

  it('throws InternalServerErrorException for unknown error', () => {
    expect(() => unwrapResult(err({ unexpected: true }))).toThrow(InternalServerErrorException);
  });
});
