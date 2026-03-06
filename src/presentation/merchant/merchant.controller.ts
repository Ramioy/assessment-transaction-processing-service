import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { unwrapResult } from '@presentation/helpers/result-to-response.helper';
import { GetMerchantConfigUseCase } from '@application/transaction/use-cases/get-merchant-config.use-case';

@ApiTags('Merchant')
@Controller('merchant')
export class MerchantController {
  constructor(private readonly getMerchantConfigUseCase: GetMerchantConfigUseCase) {}

  @Get('config')
  @ApiOperation({ summary: 'Get merchant acceptance token and available payment methods' })
  @ApiResponse({ status: 200, description: 'Merchant configuration retrieved' })
  @ApiResponse({ status: 500, description: 'Payment provider unreachable' })
  async getConfig() {
    return unwrapResult(await this.getMerchantConfigUseCase.execute());
  }
}
