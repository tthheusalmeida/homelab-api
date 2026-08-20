import { Injectable } from '@nestjs/common';
import {
  HealthCheck,
  HealthStatus,
  HealthStatusOptions,
} from '../health.model';

@Injectable()
export class HealthSystemService implements HealthCheck {
  async check(): Promise<HealthStatus> {
    return Promise.resolve({
      status: HealthStatusOptions.OK,
      service: 'system',
    });
  }
}
