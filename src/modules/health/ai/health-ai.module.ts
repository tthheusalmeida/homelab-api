import { Module } from '@nestjs/common';

import { AIModule } from 'src/modules/ai/ai.module';
import { HealthAIService } from './health-ai.service';
import { HealthAIController } from './health-ai.controller';

@Module({
  imports: [AIModule],
  controllers: [HealthAIController],
  providers: [HealthAIService],
})
export class HealthAIModule {}
