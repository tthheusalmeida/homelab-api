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
      const response = await this.aiService.health();

      if (response.status !== HealthStatusOptions.OK) {
        return {
          status: HealthStatusOptions.ERROR,
          service: 'unknown',
        };
      }

      return response;
    } catch {
      return {
        status: HealthStatusOptions.ERROR,
        service: 'unknown',
      };
    }
  }
}
