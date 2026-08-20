import { Injectable } from '@nestjs/common';
import { HealthCheck, HealthStatus, HealthStatusType } from '../health.model';

@Injectable()
export class HealthSystemService implements HealthCheck {
  async check(): Promise<HealthStatus> {
    return Promise.resolve({
      status: HealthStatusType.OK,
      service: 'system',
    });
  }
}
