import { Body, Controller, Post } from '@nestjs/common';

import type { ChatResponse } from './chat.model';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() request: ChatRequestDto): Promise<ChatResponse> {
    return this.chatService.chat(request);
  }
}
