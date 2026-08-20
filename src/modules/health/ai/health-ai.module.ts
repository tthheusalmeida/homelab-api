import { Module } from '@nestjs/common';
import { HealthAIService } from './health-ai.service.js';
import { HealthAIController } from './health-ai.controller.js';

@Module({
  controllers: [HealthAIController],
  providers: [HealthAIService],
})
export class HealthAIModule {}
