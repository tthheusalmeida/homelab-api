import { AIController } from './ai.controller';
import type { AIService } from './ai.service';
import type { AiUsageService } from './usage/ai-usage.service';

describe('AIController', () => {
  let ai: Record<'providersList' | 'models' | 'thinking', jest.Mock>;
  let usage: { getUsage: jest.Mock };
  let controller: AIController;

  beforeEach(() => {
    ai = {
      providersList: jest.fn().mockReturnValue([{ id: 'ollama' }]),
      models: jest.fn().mockResolvedValue([]),
      thinking: jest.fn().mockResolvedValue([]),
    };
    usage = { getUsage: jest.fn().mockReturnValue({ ok: true }) };
    controller = new AIController(
      ai as unknown as AIService,
      usage as unknown as AiUsageService,
    );
  });

  it('when listing providers, should delegate to the AI service', () => {
    expect(controller.providers()).toEqual([{ id: 'ollama' }]);
  });

  it('when listing models, should pass the provider id', async () => {
    await controller.models('gemini');

    expect(ai.models).toHaveBeenCalledWith('gemini');
  });

  it('when requesting thinking options, should pass provider and model ids', async () => {
    await controller.thinking('ollama', 'qwen');

    expect(ai.thinking).toHaveBeenCalledWith('ollama', 'qwen');
  });

  it('when requesting usage, should pass the optional provider filter', () => {
    expect(controller.getUsage('gemini')).toEqual({ ok: true });
    expect(usage.getUsage).toHaveBeenCalledWith('gemini');

    controller.getUsage();
    expect(usage.getUsage).toHaveBeenLastCalledWith(undefined);
  });
});
