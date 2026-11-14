import { AIService } from './ai.service';
import type { AIProvider } from './ai.model';
import type { OllamaProvider } from './providers/ollama/ollama.provider';
import type { GeminiProvider } from './providers/gemini/gemini.provider';

const makeProvider = (name: 'ollama' | 'gemini'): jest.Mocked<AIProvider> => ({
  name,
  health: jest.fn(),
  chat: jest.fn(),
  models: jest.fn(),
  thinking: jest.fn(),
});

describe('AIService', () => {
  let ollama: jest.Mocked<AIProvider>;
  let gemini: jest.Mocked<AIProvider>;
  let service: AIService;

  beforeEach(() => {
    ollama = makeProvider('ollama');
    gemini = makeProvider('gemini');
    service = new AIService(
      ollama as unknown as OllamaProvider,
      gemini as unknown as GeminiProvider,
    );
  });

  it('when listing providers, should return ollama and gemini with labels', () => {
    expect(service.providersList()).toEqual([
      { id: 'ollama', label: 'Ollama' },
      { id: 'gemini', label: 'Gemini' },
    ]);
  });

  it('when checking health, should aggregate every provider health', async () => {
    ollama.health.mockResolvedValue({
      service: 'ollama',
      description: 'd',
      status: 'ok',
    });
    gemini.health.mockResolvedValue({
      service: 'gemini',
      description: 'd',
      status: 'error',
    });

    const result = await service.health();

    expect(result.map((r) => r.service)).toEqual(['ollama', 'gemini']);
  });

  describe('models', () => {
    const model = (name: string, provider: 'ollama' | 'gemini') => ({
      name,
      provider,
      model: name,
      size: 0,
      details: {
        family: '',
        families: [],
        parameter_size: '',
        quantization_level: '',
        context_length: 0,
        embedding_length: 0,
      },
      capabilities: [],
    });

    it('when models are requested for a provider, should add id and a capitalized label', async () => {
      gemini.models.mockResolvedValue([model('gemini-3.5-flash', 'gemini')]);

      const [result] = await service.models('gemini');

      expect(result).toMatchObject({
        id: 'gemini-3.5-flash',
        label: 'Gemini 3.5 Flash',
      });
    });

    it('when models are requested without provider, should merge models of all providers', async () => {
      ollama.models.mockResolvedValue([model('a', 'ollama')]);
      gemini.models.mockResolvedValue([model('b', 'gemini')]);

      const result = await service.models();

      expect(result.map((m) => m.name)).toEqual(['a', 'b']);
    });

    it('when the provider is invalid, should reject', async () => {
      await expect(service.models('xyz' as never)).rejects.toThrow('xyz');
    });
  });

  it('when thinking options are requested, should delegate to the provider', async () => {
    ollama.thinking.mockResolvedValue([{ id: 'on', label: 'Ativado' }]);

    await expect(service.thinking('ollama', 'm')).resolves.toEqual([
      { id: 'on', label: 'Ativado' },
    ]);
    expect(ollama.thinking).toHaveBeenCalledWith('m');
  });

  it('when chat is called, should translate the DTO into the provider request', async () => {
    gemini.chat.mockResolvedValue('resposta');

    const result = await service.chat({
      message: 'oi',
      modelId: 'gemini-3.5-flash',
      providerId: 'gemini',
      thinking: 'on',
    });

    expect(result).toBe('resposta');
    expect(gemini.chat).toHaveBeenCalledWith({
      message: 'oi',
      model: 'gemini-3.5-flash',
      thinking: 'on',
    });
  });

  it('when chat is called with an invalid provider, should reject', async () => {
    await expect(
      service.chat({ message: 'x', modelId: 'm', providerId: 'zzz' as never }),
    ).rejects.toThrow('zzz');
  });
});
