import { Controller, Get } from '@nestjs/common';
import { HealthSystemService } from './health-system.service';

@Controller('health')
export class HealthSystemController {
  constructor(private readonly healthService: HealthSystemService) {}

  @Get('system')
  check() {
    return this.healthService.check();
  }
}
