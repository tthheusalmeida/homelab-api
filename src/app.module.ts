import { Module } from '@nestjs/common';

import { HealthSystemModule } from './modules/health/system/health-system.module';
import { HealthAIModule } from './modules/health/ai/health-ai.module';

import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    //health
    HealthSystemModule,
    HealthAIModule,

    ChatModule,
  ],
  providers: [],
})
export class AppModule {}
