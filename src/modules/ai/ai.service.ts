import { Injectable } from '@nestjs/common';

import type {
  AIProvider,
  AIProviderModel,
  AIProviderName,
  AIProviderInfo,
  AIThinkingOption,
} from './ai.model';

import { OllamaProvider } from './providers/ollama/ollama.provider';
import { GeminiProvider } from './providers/gemini/gemini.provider';

import { AiChatDto } from './dto/ai-chat.dto';

import { HealthCheck } from '../health/health.model';
import { AiUsageQueryDto } from './dto/ai-usage-query.dto';

@Injectable()
export class AIService {
  private readonly providers: Map<AIProviderName, AIProvider>;

  constructor(ollamaProvider: OllamaProvider, geminiProvider: GeminiProvider) {
    this.providers = new Map<AIProviderName, AIProvider>([
      ['ollama', ollamaProvider],
      ['gemini', geminiProvider],
    ]);
  }

  providersList(): AIProviderInfo[] {
    const providerNames: Record<AIProviderName, string> = {
      ollama: 'Ollama',
      gemini: 'Gemini',
    };

    return Array.from(this.providers.keys()).map((id) => ({
      id,
      label: providerNames[id],
    }));
  }

  async health(): Promise<HealthCheck[]> {
    return Promise.all(
      [...this.providers.values()].map((provider) => provider.health()),
    );
  }

  async models(provider?: AIProviderName): Promise<AIProviderModel[]> {
    if (provider) {
      const response = await this.getProvider(provider).models();

      return response.map((model) => {
        const name = String(model.name);

        return {
          ...model,
          id: name,
          label: name.replace(
            /(^|-)([a-z0-9])/g,
            (_, sep: string, c: string) => (sep ? ' ' : '') + c.toUpperCase(),
          ),
        };
      });
    }

    const models = await Promise.all(
      [...this.providers.values()].map((provider) => provider.models()),
    );

    return models.flat();
  }

  async thinking(
    providerName: AIProviderName,
    modelName: string,
  ): Promise<AIThinkingOption[]> {
    const response = await this.getProvider(providerName).thinking(modelName);

    return response;
  }

  async chat(dto: AiChatDto): Promise<string> {
    const provider = this.getProvider(dto.providerId);

    return provider.chat({
      message: dto.message,
      model: dto.modelId,
      thinking: dto.thinking,
    });
  }

  private getProvider(name: AIProviderName): AIProvider {
    const provider = this.providers.get(name);

    if (!provider) {
      throw new Error(`Provider de IA não suportado: ${name}`);
    }

    return provider;
  }

  usage(query: AiUsageQueryDto) {
    return {
      filters: {
        from: query.from ?? null,
        to: query.to ?? null,
        provider: query.provider ?? null,
      },

      summary: {
        totalRequests: 12482,
        totalInputTokens: 3250000,
        totalOutputTokens: 1570000,
        totalTokens: 4820000,
        estimatedCost: 8.42,
        averageLatencyMs: 1240,
      },

      byProvider: [
        {
          provider: 'ollama',
          requests: 7730,
          inputTokens: 2050000,
          outputTokens: 930000,
          totalTokens: 2980000,
          estimatedCost: 0,
          averageLatencyMs: 1450,
        },
        {
          provider: 'gemini',
          requests: 3120,
          inputTokens: 820000,
          outputTokens: 370000,
          totalTokens: 1190000,
          estimatedCost: 6.21,
          averageLatencyMs: 830,
        },
        {
          provider: 'groq',
          requests: 1632,
          inputTokens: 380000,
          outputTokens: 270000,
          totalTokens: 650000,
          estimatedCost: 2.21,
          averageLatencyMs: 410,
        },
      ],

      byModel: [
        {
          provider: 'ollama',
          model: 'qwen3:8b',
          requests: 5120,
          inputTokens: 1400000,
          outputTokens: 680000,
          totalTokens: 2080000,
          estimatedCost: 0,
          averageLatencyMs: 1520,
        },
        {
          provider: 'ollama',
          model: 'qwen3:4b',
          requests: 2610,
          inputTokens: 650000,
          outputTokens: 250000,
          totalTokens: 900000,
          estimatedCost: 0,
          averageLatencyMs: 1310,
        },
        {
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          requests: 3120,
          inputTokens: 820000,
          outputTokens: 370000,
          totalTokens: 1190000,
          estimatedCost: 6.21,
          averageLatencyMs: 830,
        },
        {
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          requests: 1632,
          inputTokens: 380000,
          outputTokens: 270000,
          totalTokens: 650000,
          estimatedCost: 2.21,
          averageLatencyMs: 410,
        },
      ],

      timeline: [
        {
          date: '2026-08-21',
          requests: 420,
          tokens: 142000,
          estimatedCost: 0.31,
        },
        {
          date: '2026-08-22',
          requests: 510,
          tokens: 186000,
          estimatedCost: 0.42,
        },
        {
          date: '2026-08-23',
          requests: 620,
          tokens: 221000,
          estimatedCost: 0.51,
        },
        {
          date: '2026-08-24',
          requests: 710,
          tokens: 284000,
          estimatedCost: 0.62,
        },
        {
          date: '2026-08-25',
          requests: 830,
          tokens: 310000,
          estimatedCost: 0.71,
        },
        {
          date: '2026-08-26',
          requests: 920,
          tokens: 352000,
          estimatedCost: 0.83,
        },
        {
          date: '2026-08-27',
          requests: 640,
          tokens: 241000,
          estimatedCost: 0.58,
        },
      ],

      recentRequests: [
        {
          id: 'req_001',
          provider: 'ollama',
          model: 'qwen3:8b',
          operation: 'summarization',
          inputTokens: 12500,
          outputTokens: 2500,
          totalTokens: 15000,
          estimatedCost: 0,
          latencyMs: 1240,
          success: true,
          createdAt: '2026-08-27T14:30:00.000Z',
        },
        {
          id: 'req_002',
          provider: 'gemini',
          model: 'gemini-2.5-flash',
          operation: 'fallback',
          inputTokens: 8200,
          outputTokens: 1800,
          totalTokens: 10000,
          estimatedCost: 0.0031,
          latencyMs: 830,
          success: true,
          createdAt: '2026-08-27T14:28:00.000Z',
        },
        {
          id: 'req_003',
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          operation: 'chat',
          inputTokens: 4200,
          outputTokens: 900,
          totalTokens: 5100,
          estimatedCost: 0.0018,
          latencyMs: 410,
          success: true,
          createdAt: '2026-08-27T14:25:00.000Z',
        },
      ],
    };
  }
}
