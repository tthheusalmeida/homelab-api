import { Module } from '@nestjs/common';

import { HealthSystemModule } from './modules/health/system/health-system.module';
import { HealthAIModule } from './modules/health/ai/health-ai.module';

import { ChatModule } from './modules/chat/chat.module';
import { VideoModule } from './modules/video/video.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    //health
    HealthSystemModule,
    HealthAIModule,

    JobsModule,

    ChatModule,

    VideoModule,
  ],
  providers: [],
})
export class AppModule {}
