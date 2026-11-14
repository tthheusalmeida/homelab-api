import { of, throwError } from 'rxjs';
import type { HttpService } from '@nestjs/axios';

import { OllamaProvider } from './ollama.provider';
import { AiUsageService } from '../../usage/ai-usage.service';

const validModel = (name: string) => ({
  name,
  model: name,
  size: 123,
  details: {
    family: 'qwen',
    families: ['qwen'],
    parameter_size: '8B',
    quantization_level: 'Q4',
    context_length: 4096,
  },
  capabilities: ['completion', 'thinking'],
});

describe('OllamaProvider', () => {
  let http: { get: jest.Mock; post: jest.Mock };
  let usage: AiUsageService;
  let provider: OllamaProvider;

  beforeEach(() => {
    http = { get: jest.fn(), post: jest.fn() };
    usage = new AiUsageService();
    provider = new OllamaProvider(http as unknown as HttpService, usage);
  });

  it('when read, should have name ollama', () => {
    expect(provider.name).toBe('ollama');
  });

  describe('health', () => {
    it('when /api/tags responds, should report ok', async () => {
      http.get.mockReturnValue(of({ data: {} }));

      await expect(provider.health()).resolves.toMatchObject({
        service: 'ollama',
        status: 'ok',
      });
    });

    it('when the health call fails, should report error', async () => {
      http.get.mockReturnValue(throwError(() => new Error('down')));

      await expect(provider.health()).resolves.toMatchObject({
        status: 'error',
      });
    });
  });

  describe('chat', () => {
    it('when chat succeeds with thinking on, should return text, send think=true and record usage', async () => {
      http.post.mockReturnValue(
        of({
          data: {
            message: { content: 'olá' },
            prompt_eval_count: 7,
            eval_count: 3,
          },
        }),
      );

      const text = await provider.chat({
        message: 'oi',
        model: 'qwen3.5:8b',
        thinking: 'on',
      });

      expect(text).toBe('olá');
      expect(http.post).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          model: 'qwen3.5:8b',
          think: true,
          stream: false,
          messages: [{ role: 'user', content: 'oi' }],
        }),
      );

      const [record] = usage.getUsage().recentRequests;
      expect(record).toMatchObject({
        provider: 'ollama',
        operation: 'chat',
        inputTokens: 7,
        outputTokens: 3,
        totalTokens: 10,
        estimatedCost: 0,
        success: true,
      });
    });

    it('when thinking is not on, should send think=false', async () => {
      http.post.mockReturnValue(of({ data: { message: { content: 'x' } } }));

      await provider.chat({ message: 'a', model: 'm', thinking: 'off' });

      expect(http.post.mock.calls[0][1]).toMatchObject({ think: false });
    });

    it('when the response has no token counts, should count them as 0', async () => {
      http.post.mockReturnValue(of({ data: { message: { content: 'x' } } }));

      await provider.chat({ message: 'a', model: 'm' });

      expect(usage.getUsage().summary.totalTokens).toBe(0);
    });

    it('when the chat response is invalid, should record a failure and throw', async () => {
      http.post.mockReturnValue(of({ data: { foo: 1 } }));

      await expect(
        provider.chat({ message: 'a', model: 'm' }),
      ).rejects.toThrow('chat do Ollama falhou');

      expect(usage.getUsage().recentRequests[0].success).toBe(false);
    });

    it('when the network fails, should record a failure with zeroed tokens', async () => {
      http.post.mockReturnValue(throwError(() => new Error('net')));

      await expect(
        provider.chat({ message: 'a', model: 'm' }),
      ).rejects.toThrow();

      expect(usage.getUsage().recentRequests[0]).toMatchObject({
        success: false,
        totalTokens: 0,
        estimatedCost: 0,
      });
    });
  });

  describe('models', () => {
    it('when models are listed, should map, normalize details and sort by name', async () => {
      http.get.mockReturnValue(
        of({ data: { models: [validModel('b'), validModel('a')] } }),
      );

      const result = await provider.models();

      expect(result.map((m) => m.name)).toEqual(['a', 'b']);
      expect(result[0]).toMatchObject({
        provider: 'ollama',
        capabilities: ['completion', 'thinking'],
        details: { embedding_length: 0, context_length: 4096 },
      });
    });

    it('when the models payload has an unexpected shape, should throw', async () => {
      http.get.mockReturnValue(of({ data: { nope: [] } }));

      await expect(provider.models()).rejects.toThrow('listar modelos');
    });

    it('when a model item is invalid, should throw', async () => {
      http.get.mockReturnValue(of({ data: { models: [{ name: 'x' }] } }));

      await expect(provider.models()).rejects.toThrow('listar modelos');
    });
  });

  describe('thinking', () => {
    it('when the model has the thinking capability, should return off and on options', async () => {
      http.post.mockReturnValue(
        of({ data: { capabilities: ['completion', 'thinking'] } }),
      );

      await expect(provider.thinking('m')).resolves.toEqual([
        { id: 'off', label: 'Desativado' },
        { id: 'on', label: 'Ativado' },
      ]);
      expect(http.post).toHaveBeenCalledWith(
        'http://localhost:11434/api/show',
        { name: 'm' },
      );
    });

    it('when the model lacks the thinking capability, should return an empty list', async () => {
      http.post.mockReturnValue(of({ data: { capabilities: ['completion'] } }));

      await expect(provider.thinking('m')).resolves.toEqual([]);
    });

    it('when the response has no capabilities, should return an empty list', async () => {
      http.post.mockReturnValue(of({ data: {} }));

      await expect(provider.thinking('m')).resolves.toEqual([]);
    });

    it('when the network fails, should throw an error naming the model', async () => {
      http.post.mockReturnValue(throwError(() => new Error('x')));

      await expect(provider.thinking('meu-modelo')).rejects.toThrow(
        'meu-modelo',
      );
    });
  });
});
