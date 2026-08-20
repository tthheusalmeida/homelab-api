import { Module } from '@nestjs/common';
import { HealthSystemModule } from './modules/health/system/health-system.module';
import { HealthAIModule } from './modules/health/ai/health-ai.module';

@Module({
  imports: [
    //health
    HealthSystemModule,
    HealthAIModule,
  ],
  providers: [],
})
export class AppModule {}
