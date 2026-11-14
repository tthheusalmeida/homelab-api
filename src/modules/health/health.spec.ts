import { HealthAIService } from './ai/health-ai.service';
import { HealthAIController } from './ai/health-ai.controller';
import { HealthSystemService } from './system/health-system.service';
import { HealthSystemController } from './system/health-system.controller';
import type { AIService } from '../ai/ai.service';

describe('HealthSystemService', () => {
  it('when checking, should report the api as ok', async () => {
    await expect(new HealthSystemService().check()).resolves.toEqual({
      service: 'system',
      description: expect.any(String),
      checks: [
        { service: 'api', description: expect.any(String), status: 'ok' },
      ],
    });
  });
});

describe('HealthAIService', () => {
  it('when checking, should group the checks of every AI provider', async () => {
    const checks = [
      { service: 'ollama', description: 'd', status: 'ok' },
      { service: 'gemini', description: 'd', status: 'error' },
    ];
    const ai = { health: jest.fn().mockResolvedValue(checks) };

    const result = await new HealthAIService(
      ai as unknown as AIService,
    ).check();

    expect(result).toMatchObject({ service: 'ai', checks });
  });
});

describe('health controllers', () => {
  it('when GET health/system, should delegate to the system service', () => {
    const service = { check: jest.fn().mockReturnValue('r') };

    expect(new HealthSystemController(service as never).check()).toBe('r');
  });

  it('when GET health/ai, should delegate to the AI service', () => {
    const service = { check: jest.fn().mockReturnValue('r') };

    expect(new HealthAIController(service as never).check()).toBe('r');
  });
});
