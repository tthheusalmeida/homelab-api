import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import type {
  AIChatRequest,
  AIProvider,
  AIProviderModel,
  AIThinkingOption,
} from '../../ai.model';

import { hasProperty, isObject, isString } from 'src/utils/type-guards';

import {
  HealthCheck,
  HealthStatusOptions,
} from 'src/modules/health/health.model';

import { AiUsageService } from '../../usage/ai-usage.service';

import { pricing } from './ollama.pricing';

function parseOllamaChatResponse(data: unknown): string {
  if (
    !isObject(data) ||
    !hasProperty(data, 'message') ||
    !isObject(data.message) ||
    !hasProperty(data.message, 'content') ||
    !isString(data.message.content)
  ) {
    throw new Error('A resposta do chat do Ollama é inválida.');
  }

  return data.message.content;
}

function parseOllamaModelsResponse(data: unknown): AIProviderModel[] {
  if (
    !isObject(data) ||
    !hasProperty(data, 'models') ||
    !Array.isArray(data.models)
  ) {
    throw new Error('A resposta de modelos do Ollama é inválida.');
  }

  return data.models.map((item) => {
    if (
      !isObject(item) ||
      !hasProperty(item, 'name') ||
      !isString(item.name) ||
      !hasProperty(item, 'model') ||
      !isString(item.model) ||
      !hasProperty(item, 'size') ||
      typeof item.size !== 'number' ||
      !hasProperty(item, 'details') ||
      !isObject(item.details) ||
      !hasProperty(item, 'capabilities') ||
      !Array.isArray(item.capabilities)
    ) {
      throw new Error('Formato do modelo do Ollama é inválido.');
    }

    const details = item.details;

    return {
      name: item.name,
      provider: 'ollama',
      model: item.model,
      size: item.size,
      details: {
        family: isString(details.family) ? details.family : '',
        families: Array.isArray(details.families)
          ? details.families.map(String)
          : [],
        parameter_size: isString(details.parameter_size)
          ? details.parameter_size
          : '',
        quantization_level: isString(details.quantization_level)
          ? details.quantization_level
          : '',
        context_length: Number(details.context_length ?? 0),
        embedding_length: Number(details.embedding_length ?? 0),
      },
      capabilities: item.capabilities.map(String),
    };
  });
}

@Injectable()
export class OllamaProvider implements AIProvider {
  readonly name = 'ollama' as const;
  private readonly baseUrl = 'http://localhost:11434';

  constructor(
    private readonly httpService: HttpService,
    private readonly usageService: AiUsageService,
  ) {}

  private calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const modelPricing = pricing.get(model);

    if (!modelPricing) {
      return 0;
    }

    return (
      (inputTokens / 1_000_000) * modelPricing.inputPerMillionTokens +
      (outputTokens / 1_000_000) * modelPricing.outputPerMillionTokens
    );
  }

  async health(): Promise<HealthCheck> {
    try {
      await firstValueFrom(this.httpService.get(`${this.baseUrl}/api/tags`));

      return {
        service: 'ollama',
        description: 'Serviço de IA local',
        status: HealthStatusOptions.OK,
      };
    } catch {
      return {
        service: 'ollama',
        description: 'Serviço de IA local',
        status: HealthStatusOptions.ERROR,
      };
    }
  }

  async chat(request: AIChatRequest): Promise<string> {
    const startedAt = Date.now();

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/chat`, {
          model: request.model,
          messages: [
            {
              role: 'user',
              content: request.message,
            },
          ],
          think: request.thinking === 'on',
          stream: false,
        }),
      );

      const latencyMs = Date.now() - startedAt;

      const text = parseOllamaChatResponse(response.data);

      const data: unknown = response.data;

      const inputTokens =
        isObject(data) && hasProperty(data, 'prompt_eval_count')
          ? Number(data.prompt_eval_count ?? 0)
          : 0;

      const outputTokens =
        isObject(data) && hasProperty(data, 'eval_count')
          ? Number(data.eval_count ?? 0)
          : 0;

      const totalTokens = inputTokens + outputTokens;

      const estimatedCost = this.calculateCost(
        request.model,
        inputTokens,
        outputTokens,
      );

      this.usageService.record({
        provider: 'ollama',
        model: request.model,
        operation: 'chat',
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost,
        latencyMs,
        success: true,
      });

      return text;
    } catch (error) {
      this.usageService.record({
        provider: 'ollama',
        model: request.model,
        operation: 'chat',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        latencyMs: Date.now() - startedAt,
        success: false,
      });

      throw new Error('A requisição para o chat do Ollama falhou.', {
        cause: error,
      });
    }
  }

  async models(): Promise<AIProviderModel[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/tags`),
      );

      const result = parseOllamaModelsResponse(response.data);

      return result.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      throw new Error('A requisição para listar modelos do Ollama falhou.', {
        cause: error,
      });
    }
  }

  async thinking(model: string): Promise<AIThinkingOption[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/show`, {
          name: model,
        }),
      );

      const data: unknown = response.data;

      if (
        !isObject(data) ||
        !hasProperty(data, 'capabilities') ||
        !Array.isArray(data.capabilities)
      ) {
        return [];
      }

      const capabilities = data.capabilities.map(String);

      if (!capabilities.includes('thinking')) {
        return [];
      }

      return [
        {
          id: 'off',
          label: 'Desativado',
        },
        {
          id: 'on',
          label: 'Ativado',
        },
      ];
    } catch (error) {
      throw new Error(
        `Não foi possível consultar as capacidades do modelo ${model} no Ollama.`,
        {
          cause: error,
        },
      );
    }
  }
}
