import { Controller, Get } from '@nestjs/common';
import { HealthAIService } from './health-ai.service';

@Controller('health-ai')
export class HealthAIController {
  constructor(private readonly healthService: HealthAIService) {}

  @Get()
  check() {
    return this.healthService.check();
  }
}
