import { Controller, Get } from '@nestjs/common';
import { HealthAIService } from './health-ai.service';

@Controller('health')
export class HealthAIController {
  constructor(private readonly healthService: HealthAIService) {}

  @Get('ai')
  check() {
    return this.healthService.check();
  }
}
