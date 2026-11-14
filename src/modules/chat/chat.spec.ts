import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import type { AIService } from '../ai/ai.service';

const dto = {
  message: 'oi',
  modelId: 'm',
  providerId: 'ollama' as const,
};

describe('ChatService', () => {
  it('when chatting, should wrap the AI answer in { message }', async () => {
    const ai = { chat: jest.fn().mockResolvedValue('resposta') };
    const service = new ChatService(ai as unknown as AIService);

    await expect(service.chat(dto)).resolves.toEqual({ message: 'resposta' });
    expect(ai.chat).toHaveBeenCalledWith(dto);
  });

  it('when the AI service fails, should propagate the error', async () => {
    const ai = { chat: jest.fn().mockRejectedValue(new Error('x')) };
    const service = new ChatService(ai as unknown as AIService);

    await expect(service.chat(dto)).rejects.toThrow('x');
  });
});

describe('ChatController', () => {
  it('when posting a chat, should delegate to the chat service', async () => {
    const chatService = { chat: jest.fn().mockResolvedValue({ message: 'a' }) };
    const controller = new ChatController(chatService as never);

    await expect(controller.chat(dto)).resolves.toEqual({ message: 'a' });
    expect(chatService.chat).toHaveBeenCalledWith(dto);
  });
});
