import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { VideoService } from './video.service';
import { AIService } from '../ai/ai.service';
import { OllamaProvider } from '../ai/providers/ollama/ollama.provider';
import { GeminiProvider } from '../ai/providers/gemini/gemini.provider';
import { AiUsageService } from '../ai/usage/ai-usage.service';

@Module({
  imports: [HttpModule],
  providers: [
    VideoService,

    AIService,
    AiUsageService,
    OllamaProvider,
    GeminiProvider,
  ],
  exports: [VideoService],
})
export class VideoModule {}
