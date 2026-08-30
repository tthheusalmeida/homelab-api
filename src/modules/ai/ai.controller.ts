import { Controller, Get, Query, Param } from '@nestjs/common';

import type { AIProviderName } from './ai.model';

import { AIService } from './ai.service';
import { AiUsageService } from './usage/ai-usage.service';

@Controller('ai')
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly aiUsageService: AiUsageService,
  ) {}

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
  getUsage(@Query('provider') provider?: AIProviderName) {
    return this.aiUsageService.getUsage(provider);
  }
}
