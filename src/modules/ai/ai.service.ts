import { Inject, Injectable } from '@nestjs/common';

import { AI_PROVIDER } from './ai.model';
import type { AIProvider } from './ai.model';
import { HealthStatus } from '../health/health.model';

@Injectable()
export class AIService {
  constructor(
    @Inject(AI_PROVIDER)
    private readonly provider: AIProvider,
  ) {}

  async health(): Promise<HealthStatus> {
    return this.provider.health();
  }

  async chat(message: string, model: string): Promise<string> {
    return this.provider.chat(message, model);
  }
}
