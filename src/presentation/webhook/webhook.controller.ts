import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';

import { Public } from '@shared/guards/public.decorator';
import { ZodValidationPipe } from '@presentation/pipes/zod-validation.pipe';
import { unwrapResult } from '@presentation/helpers/result-to-response.helper';
import {
  HandleWebhookEventUseCase,
  type WebhookEventInput,
} from '@application/transaction/use-cases/handle-webhook-event.use-case';

const webhookBodySchema = z.object({
  data: z.record(z.string(), z.unknown()),
  signature: z.object({
    properties: z.array(z.string()),
  }),
  timestamp: z.number().int(),
});

type WebhookBody = z.infer<typeof webhookBodySchema>;

/** Resolves dot-notation property paths against the data object. */
function extractPropertyValues(data: Record<string, unknown>, properties: string[]): string[] {
  return properties.map((prop) => {
    const parts = prop.split('.');
    let current: unknown = data;
    for (const part of parts) {
      if (current === null || typeof current !== 'object') return '';
      current = (current as Record<string, unknown>)[part];
    }
    return String(current ?? '');
  });
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly handleWebhookEventUseCase: HandleWebhookEventUseCase) {}

  @Post('payment-provider')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive payment provider event notifications' })
  @ApiResponse({ status: 200, description: 'Event processed' })
  @ApiResponse({ status: 400, description: 'Invalid payload structure' })
  @ApiResponse({ status: 401, description: 'Checksum validation failed' })
  async handle(
    @Headers('x-event-checksum') checksum: string,
    @Body(new ZodValidationPipe(webhookBodySchema)) body: WebhookBody,
  ) {
    const tx = (body.data.transaction ?? {}) as Record<string, unknown>;

    const input: WebhookEventInput = {
      checksum,
      propertyValues: extractPropertyValues(body.data, body.signature.properties),
      timestamp: body.timestamp,
      data: {
        providerId: String(tx.id ?? ''),
        status: String(tx.status ?? ''),
        statusMessage: (tx.status_message as string | null) ?? null,
        raw: tx,
      },
    };

    return unwrapResult(await this.handleWebhookEventUseCase.execute(input));
  }
}
