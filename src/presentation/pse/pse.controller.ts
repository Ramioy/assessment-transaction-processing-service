import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { Public } from '@shared/guards/public.decorator';
import { unwrapResult } from '@presentation/helpers/result-to-response.helper';
import { ListPseInstitutionsUseCase } from '@application/transaction/use-cases/list-pse-institutions.use-case';

@ApiTags('PSE')
@Controller('pse')
export class PseController {
  constructor(private readonly listPseInstitutionsUseCase: ListPseInstitutionsUseCase) {}

  @Get('financial-institutions')
  @Public()
  @ApiOperation({ summary: 'List available PSE financial institutions' })
  @ApiResponse({ status: 200, description: 'List of financial institutions' })
  @ApiResponse({ status: 500, description: 'Payment provider unreachable' })
  async listInstitutions() {
    return unwrapResult(await this.listPseInstitutionsUseCase.execute());
  }
}
