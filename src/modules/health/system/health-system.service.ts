import { Injectable } from '@nestjs/common';
import {
  HealthCheckService,
  HealthService,
  HealthStatusOptions,
} from '../health.model';

@Injectable()
export class HealthSystemService implements HealthCheckService {
  check(): Promise<HealthService> {
    return Promise.resolve({
      service: 'system',
      description: 'Serviços do sistema',
      checks: [
        {
          service: 'api',
          description: 'API do HomeLab',
          status: HealthStatusOptions.OK,
        },
      ],
    });
  }
}
