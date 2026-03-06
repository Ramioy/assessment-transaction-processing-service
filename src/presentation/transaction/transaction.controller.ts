import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';

import { ZodValidationPipe } from '@presentation/pipes/zod-validation.pipe';
import { unwrapResult } from '@presentation/helpers/result-to-response.helper';
import { createTransactionSchema } from '@domain/transaction/transaction.entity';
import { paymentMethodSchema } from '@domain/payment-method/payment-method.value-object';
import { CreateTransactionUseCase } from '@application/transaction/use-cases/create-transaction.use-case';
import { GetTransactionStatusUseCase } from '@application/transaction/use-cases/get-transaction-status.use-case';

const createTransactionRequestSchema = createTransactionSchema.extend({
  paymentMethodDetails: paymentMethodSchema,
});

type CreateTransactionRequestDto = z.infer<typeof createTransactionRequestSchema>;

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionController {
  constructor(
    private readonly createTransactionUseCase: CreateTransactionUseCase,
    private readonly getTransactionStatusUseCase: GetTransactionStatusUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new payment transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Duplicate reference' })
  @ApiResponse({ status: 422, description: 'Invalid amount or payment method' })
  @ApiResponse({ status: 502, description: 'Payment provider error' })
  async create(
    @Body(new ZodValidationPipe(createTransactionRequestSchema))
    dto: CreateTransactionRequestDto,
  ) {
    return unwrapResult(await this.createTransactionUseCase.execute(dto));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction status (refreshes from provider)' })
  @ApiParam({ name: 'id', type: 'string', description: 'Transaction UUID' })
  @ApiResponse({ status: 200, description: 'Transaction found' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getStatus(@Param('id') id: string) {
    return unwrapResult(await this.getTransactionStatusUseCase.execute(id));
  }
}
