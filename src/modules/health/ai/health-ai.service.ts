import { Injectable } from '@nestjs/common';

import { HealthCheckService, HealthService } from '../health.model';

import { AIService } from 'src/modules/ai/ai.service';

@Injectable()
export class HealthAIService implements HealthCheckService {
  constructor(private readonly aiService: AIService) {}

  async check(): Promise<HealthService> {
    return {
      service: 'ai',
      description: 'Serviços de inteligência artificial',
      checks: await this.aiService.health(),
    };
  }
}
