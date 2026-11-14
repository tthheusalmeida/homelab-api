const generateContent = jest.fn();
const list = jest.fn();
const get = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent, list, get },
  })),
}));

import { GeminiProvider } from './gemini.provider';
import { AiUsageService } from '../../usage/ai-usage.service';

async function* asyncList<T>(items: T[]) {
  for (const item of items) {
    yield item;
  }
}

describe('GeminiProvider', () => {
  const originalKey = process.env.GEMINI_API_KEY;
  let usage: AiUsageService;

  const build = () => new GeminiProvider(usage);

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    usage = new AiUsageService();
    generateContent.mockReset();
    list.mockReset();
    get.mockReset();
  });

  afterAll(() => {
    process.env.GEMINI_API_KEY = originalKey;
  });

  it('when GEMINI_API_KEY is missing, should throw on construction', () => {
    delete process.env.GEMINI_API_KEY;

    expect(() => build()).toThrow('GEMINI_API_KEY');
  });

  describe('health', () => {
    it('when models.list works, should report ok', async () => {
      list.mockResolvedValue([]);

      await expect(build().health()).resolves.toMatchObject({
        service: 'gemini',
        status: 'ok',
      });
    });

    it('when models.list fails, should report error', async () => {
      list.mockRejectedValue(new Error('x'));

      await expect(build().health()).resolves.toMatchObject({
        status: 'error',
      });
    });
  });

  describe('chat', () => {
    it('when chat succeeds, should strip the models/ prefix, return text and record usage with cost', async () => {
      generateContent.mockResolvedValue({
        text: 'resp',
        usageMetadata: {
          promptTokenCount: 1_000_000,
          candidatesTokenCount: 1_000_000,
          totalTokenCount: 2_000_000,
        },
      });

      const text = await build().chat({
        message: 'oi',
        model: 'models/gemini-3.5-flash',
      });

      expect(text).toBe('resp');
      expect(generateContent).toHaveBeenCalledWith({
        model: 'gemini-3.5-flash',
        contents: 'oi',
      });

      // 1M entrada * 0.75 + 1M saída * 4.5
      expect(usage.getUsage().recentRequests[0]).toMatchObject({
        provider: 'gemini',
        model: 'gemini-3.5-flash',
        totalTokens: 2_000_000,
        estimatedCost: 5.25,
        success: true,
      });
    });

    it('when the model has no registered price, should have cost 0', async () => {
      generateContent.mockResolvedValue({
        text: 'r',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10 },
      });

      await build().chat({ message: 'a', model: 'desconhecido' });

      expect(usage.getUsage().recentRequests[0]).toMatchObject({
        estimatedCost: 0,
        totalTokens: 20,
      });
    });

    it('when the response has no text, should record a single failure and throw', async () => {
      generateContent.mockResolvedValue({ text: '' });

      await expect(
        build().chat({ message: 'a', model: 'm' }),
      ).rejects.toThrow('chat do Gemini falhou');

      const { recentRequests } = usage.getUsage();
      expect(recentRequests).toHaveLength(1);
      expect(recentRequests[0].success).toBe(false);
    });

    it('when the API fails, should record a failure and throw', async () => {
      generateContent.mockRejectedValue(new Error('api'));

      await expect(
        build().chat({ message: 'a', model: 'm' }),
      ).rejects.toThrow('chat do Gemini falhou');

      expect(usage.getUsage().recentRequests[0].success).toBe(false);
    });
  });

  describe('models', () => {
    it('when models are listed, should keep only priced models, normalized and sorted', async () => {
      list.mockResolvedValue(
        asyncList([
          {
            name: 'models/gemini-3.5-flash',
            inputTokenLimit: 1000,
            supportedActions: ['generateContent'],
          },
          { name: 'models/nao-cadastrado' },
          { name: 'models/gemini-3.1-flash-lite' },
        ]),
      );

      const result = await build().models();

      expect(result.map((m) => m.name)).toEqual([
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash',
      ]);
      expect(result[1]).toMatchObject({
        provider: 'gemini',
        details: { context_length: 1000 },
        capabilities: ['generateContent'],
      });
    });

    it('when listing models fails, should throw', async () => {
      list.mockRejectedValue(new Error('x'));

      await expect(build().models()).rejects.toThrow('listar modelos');
    });
  });

  describe('thinking', () => {
    it('when the model supports thinking, should return off and on options', async () => {
      get.mockResolvedValue({ thinking: true });

      await expect(build().thinking('models/m')).resolves.toEqual([
        { id: 'off', label: 'Desativado' },
        { id: 'on', label: 'Ativado' },
      ]);
      expect(get).toHaveBeenCalledWith({ model: 'm' });
    });

    it('when the model does not support thinking, should return an empty list', async () => {
      get.mockResolvedValue({ thinking: false });

      await expect(build().thinking('m')).resolves.toEqual([]);
    });

    it('when the API fails, should throw an error naming the model', async () => {
      get.mockRejectedValue(new Error('x'));

      await expect(build().thinking('abc')).rejects.toThrow('abc');
    });
  });
});
