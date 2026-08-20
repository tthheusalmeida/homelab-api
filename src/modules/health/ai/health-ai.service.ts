import { Injectable } from '@nestjs/common';
import { HealthCheck, HealthStatus, HealthStatusType } from '../health.model';

@Injectable()
export class HealthAIService implements HealthCheck {
  async check(): Promise<HealthStatus> {
    try {
      const response = await fetch('http://localhost:11434/api/tags');

      if (!response.ok) {
        return {
          status: HealthStatusType.ERROR,
          service: 'ollama',
        };
      }

      return {
        status: HealthStatusType.OK,
        service: 'ollama',
      };
    } catch {
      return {
        status: HealthStatusType.ERROR,
        service: 'ollama',
      };
    }
  }
}
