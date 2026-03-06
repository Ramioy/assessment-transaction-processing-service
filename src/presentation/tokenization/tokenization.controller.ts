import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';

import { ZodValidationPipe } from '@presentation/pipes/zod-validation.pipe';
import { unwrapResult } from '@presentation/helpers/result-to-response.helper';
import { TokenizeCardUseCase } from '@application/transaction/use-cases/tokenize-card.use-case';

const tokenizeCardRequestSchema = z.object({
  number: z.string().min(13).max(19),
  expMonth: z.string().length(2),
  expYear: z.string().min(2).max(4),
  cvc: z.string().min(3).max(4),
  cardHolder: z.string().min(1),
});

type TokenizeCardRequestDto = z.infer<typeof tokenizeCardRequestSchema>;

@ApiTags('Tokenization')
@Controller('tokenization')
export class TokenizationController {
  constructor(private readonly tokenizeCardUseCase: TokenizeCardUseCase) {}

  @Post('cards')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tokenize a credit/debit card' })
  @ApiResponse({ status: 201, description: 'Card tokenized successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 502, description: 'Tokenization failed at payment provider' })
  async tokenize(
    @Body(new ZodValidationPipe(tokenizeCardRequestSchema)) dto: TokenizeCardRequestDto,
  ) {
    return unwrapResult(await this.tokenizeCardUseCase.execute(dto));
  }
}
