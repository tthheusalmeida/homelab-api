import { Controller, Get, Query, Param } from '@nestjs/common';

import { AIService } from './ai.service';
import type { AIProviderName } from './ai.model';

import { AiUsageQueryDto } from './dto/ai-usage-query.dto';

@Controller('ai')
export class AIController {
  constructor(private readonly aiService: AIService) {}

  @Get('providers')
  providers() {
    return this.aiService.providersList();
  }

  @Get('providers/:providerId/models')
  async models(@Param('providerId') providerId: AIProviderName) {
    return this.aiService.models(providerId);
  }

  @Get('thinking')
  thinking(
    @Query('providerId') providerId: AIProviderName,
    @Query('modelId') modelId: string,
  ) {
    return this.aiService.thinking(providerId, modelId);
  }

  @Get('usage')
  usage(@Query() query: AiUsageQueryDto) {
    return this.aiService.usage(query);
  }
}
