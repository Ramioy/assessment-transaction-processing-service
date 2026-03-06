import {
  BadGatewayException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { type Result } from '@shared/result';
import { InfrastructureError } from '@shared/errors/infrastructure.error';
import {
  DuplicateReferenceError,
  InvalidAmountError,
  InvalidPaymentMethodError,
  TokenizationFailedError,
  TransactionCreationFailedError,
  TransactionNotFoundError,
  WebhookValidationFailedError,
} from '@domain/transaction/errors';

export function unwrapResult<T>(result: Result<T, unknown>): T {
  if (result.ok) return result.value;

  const { error } = result;

  if (error instanceof TransactionNotFoundError) throw new NotFoundException(error.message);
  if (error instanceof DuplicateReferenceError) throw new ConflictException(error.message);
  if (error instanceof InvalidAmountError) throw new UnprocessableEntityException(error.message);
  if (error instanceof InvalidPaymentMethodError)
    throw new UnprocessableEntityException(error.message);
  if (error instanceof TokenizationFailedError) throw new BadGatewayException(error.message);
  if (error instanceof TransactionCreationFailedError)
    throw new BadGatewayException(error.message);
  if (error instanceof WebhookValidationFailedError)
    throw new UnauthorizedException(error.message);
  if (error instanceof InfrastructureError)
    throw new InternalServerErrorException(error.message);

  throw new InternalServerErrorException('Unexpected error');
}
