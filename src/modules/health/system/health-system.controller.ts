import { Controller, Get } from '@nestjs/common';
import { HealthSystemService } from './health-system.service';

@Controller('health-system')
export class HealthSystemController {
  constructor(private readonly healthService: HealthSystemService) {}

  @Get()
  check() {
    return this.healthService.check();
  }
}
