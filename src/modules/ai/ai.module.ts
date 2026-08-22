import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { AI_PROVIDER } from './ai.model';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { OllamaProvider } from './providers/ollama.provider';

@Module({
  imports: [HttpModule],
  controllers: [AIController],
  providers: [
    OllamaProvider,
    {
      provide: AI_PROVIDER,
      useExisting: OllamaProvider,
    },
    AIService,
  ],
  exports: [AIService],
})
export class AIModule {}
