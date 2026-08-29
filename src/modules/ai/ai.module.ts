import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { AIService } from './ai.service';
import { AIController } from './ai.controller';

import { OllamaProvider } from './providers/ollama.provider';
import { WhisperService } from './whisper/whisper.service';
import { GeminiProvider } from './providers/gemini.provider';

@Module({
  imports: [HttpModule],
  controllers: [AIController],
  providers: [OllamaProvider, GeminiProvider, WhisperService, AIService],
  exports: [AIService, WhisperService],
})
export class AIModule {}
