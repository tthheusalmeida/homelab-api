import { Injectable } from '@nestjs/common';

import {
  HealthCheck,
  HealthStatus,
  HealthStatusOptions,
} from '../health.model';

import { AIService } from 'src/modules/ai/ai.service';

@Injectable()
export class HealthAIService implements HealthCheck {
  constructor(private readonly aiService: AIService) {}

  async check(): Promise<HealthStatus> {
    try {
      const responses = await this.aiService.health();

      const hasError = responses.some(
        (response) => response.status !== HealthStatusOptions.OK,
      );

      return {
        status: hasError ? HealthStatusOptions.ERROR : HealthStatusOptions.OK,
        service: 'ai',
      };
    } catch {
      return {
        status: HealthStatusOptions.ERROR,
        service: 'ai',
      };
    }
  }
}
