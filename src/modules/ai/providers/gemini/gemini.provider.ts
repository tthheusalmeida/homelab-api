import { Injectable } from '@nestjs/common';

import { GoogleGenAI } from '@google/genai';

import type {
  AIChatRequest,
  AIProvider,
  AIProviderModel,
  AIThinkingOption,
} from '../../ai.model';

import {
  HealthStatus,
  HealthStatusOptions,
} from 'src/modules/health/health.model';

import { AiUsageService } from '../../usage/ai-usage.service';

import { pricing } from './gemini.pricing';

// export declare interface Endpoint {
//   name?: string;
//   deployedModelId?: string;
// }

// export declare interface Checkpoint {
//   checkpointId?: string;
//   epoch?: string;
//   step?: string;
// }

// export declare interface TunedModelInfo {
//   baseModel?: string;
//   createTime?: string;
//   updateTime?: string;
// }

// interface GeminiModel {
//   name?: string;
//   displayName?: string;
//   description?: string;
//   version?: string;
//   endpoints?: Endpoint[];
//   labels?: Record<string, string>;
//   tunedModelInfo?: TunedModelInfo;
//   inputTokenLimit?: number;
//   outputTokenLimit?: number;
//   supportedActions?: string[];
//   defaultCheckpointId?: string;
//   checkpoints?: Checkpoint[];
//   temperature?: number;
//   maxTemperature?: number;
//   topP?: number;
//   topK?: number;
//   thinking?: boolean;
// }

@Injectable()
export class GeminiProvider implements AIProvider {
  private readonly apiKey = process.env.GEMINI_API_KEY;
  private readonly ai: GoogleGenAI;
  readonly name = 'gemini' as const;

  constructor(private readonly usageService: AiUsageService) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY não configurada.');
    }

    this.ai = new GoogleGenAI({
      apiKey: this.apiKey,
    });
  }

  private normalizeModel(model: string): string {
    return model.startsWith('models/') ? model.replace(/^models\//, '') : model;
  }

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

  async health(): Promise<HealthStatus> {
    if (!this.apiKey) {
      return {
        status: HealthStatusOptions.ERROR,
        service: 'gemini',
      };
    }

    try {
      await this.ai.models.list();

      return {
        status: HealthStatusOptions.OK,
        service: 'gemini',
      };
    } catch {
      return {
        status: HealthStatusOptions.ERROR,
        service: 'gemini',
      };
    }
  }

  async chat(request: AIChatRequest): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY não configurada.');
    }

    const model = this.normalizeModel(request.model);
    const startedAt = Date.now();

    try {
      const response = await this.ai.models.generateContent({
        model,
        contents: request.message,
      });

      const latencyMs = Date.now() - startedAt;

      if (!response.text) {
        this.usageService.record({
          provider: 'gemini',
          model,
          operation: 'chat',
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
          latencyMs,
          success: false,
        });

        throw new Error('A resposta do Gemini não contém texto.');
      }

      const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
      const totalTokens =
        response.usageMetadata?.totalTokenCount ?? inputTokens + outputTokens;

      const estimatedCost = this.calculateCost(
        model,
        inputTokens,
        outputTokens,
      );

      this.usageService.record({
        provider: 'gemini',
        model,
        operation: 'chat',
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost,
        latencyMs,
        success: true,
      });

      return response.text;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'A resposta do Gemini não contém texto.'
      ) {
        throw new Error('A requisição para o chat do Gemini falhou.', {
          cause: error,
        });
      }

      this.usageService.record({
        provider: 'gemini',
        model,
        operation: 'chat',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        latencyMs: Date.now() - startedAt,
        success: false,
      });

      throw new Error('A requisição para o chat do Gemini falhou.', {
        cause: error,
      });
    }
  }

  async models(): Promise<AIProviderModel[]> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY não configurada.');
    }

    try {
      const result: AIProviderModel[] = [];

      for await (const model of await this.ai.models.list()) {
        const geminiModel = model;

        if (
          !geminiModel.name &&
          !geminiModel.supportedActions?.includes('generateContent')
        ) {
          continue;
        }

        const modelName = this.normalizeModel(geminiModel.name ?? '');

        if (!pricing.has(modelName)) {
          continue;
        }

        result.push({
          name: modelName,
          provider: 'gemini',
          model: modelName,
          size: 0,
          details: {
            family: 'gemini',
            families: ['gemini'],
            parameter_size: '',
            quantization_level: '',
            context_length: geminiModel.inputTokenLimit ?? 0,
            embedding_length: 0,
          },
          capabilities: geminiModel.supportedActions ?? [],
        });
      }

      return result.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      throw new Error('A requisição para listar modelos do Gemini falhou.', {
        cause: error,
      });
    }
  }

  async thinking(model: string): Promise<AIThinkingOption[]> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY não configurada.');
    }

    try {
      const normalizedModel = this.normalizeModel(model);

      const modelInfo = await this.ai.models.get({
        model: normalizedModel,
      });

      if (!modelInfo.thinking) {
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
        `Não foi possível consultar as capacidades do modelo ${model} no Gemini.`,
        {
          cause: error,
        },
      );
    }
  }
}
