import { Injectable } from '@nestjs/common';

import { AIService } from '../ai/ai.service';

import { ChatResponse } from './chat.model';
import { AiChatDto } from '../ai/dto/ai-chat.dto';

@Injectable()
export class ChatService {
  constructor(private readonly aiService: AIService) {}

  async chat(request: AiChatDto): Promise<ChatResponse> {
    const message = await this.aiService.chat(request);

    return {
      message,
    };
  }
}
