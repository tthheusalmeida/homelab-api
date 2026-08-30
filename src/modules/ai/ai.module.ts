import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { AIService } from './ai.service';
import { AiUsageService } from './usage/ai-usage.service';

import { AIController } from './ai.controller';

import { OllamaProvider } from './providers/ollama/ollama.provider';
import { WhisperService } from './whisper/whisper.service';
import { GeminiProvider } from './providers/gemini/gemini.provider';

@Module({
  imports: [HttpModule],
  controllers: [AIController],
  providers: [
    AIService,
    AiUsageService,

    OllamaProvider,
    GeminiProvider,
    WhisperService,
  ],
  exports: [AIService, WhisperService],
})
export class AIModule {}
