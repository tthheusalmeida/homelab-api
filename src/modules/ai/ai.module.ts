import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { AI_PROVIDER } from './ai.model';

import { AIService } from './ai.service';
import { AIController } from './ai.controller';

import { OllamaProvider } from './providers/ollama.provider';
import { WhisperService } from './whisper/whisper.service';

@Module({
  imports: [HttpModule],
  controllers: [AIController],
  providers: [
    OllamaProvider,
    WhisperService,
    {
      provide: AI_PROVIDER,
      useExisting: OllamaProvider,
    },
    AIService,
  ],
  exports: [AIService, WhisperService],
})
export class AIModule {}
