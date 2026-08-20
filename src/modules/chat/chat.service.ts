import { Injectable } from '@nestjs/common';

import { AIService } from '../ai/ai.service';
import { ChatRequest, ChatResponse } from './chat.model';

@Injectable()
export class ChatService {
  constructor(private readonly aiService: AIService) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const message = await this.aiService.chat(
      request.message,
      request.model,
      request.think ?? false,
    );

    return {
      message,
    };
  }
}
