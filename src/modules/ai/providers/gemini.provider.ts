import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

import type {
  AIChatRequest,
  AIProvider,
  AIProviderModel,
  AIThinkingOption,
} from '../ai.model';

import {
  HealthStatus,
  HealthStatusOptions,
} from 'src/modules/health/health.model';

@Injectable()
export class GeminiProvider implements AIProvider {
  private readonly apiKey = process.env.GEMINI_API_KEY;
  private readonly ai: GoogleGenAI;
  readonly name = 'gemini' as const;

  constructor() {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY não configurada.');
    }

    this.ai = new GoogleGenAI({
      apiKey: this.apiKey,
    });
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

    try {
      const normalizedModel = request.model.startsWith('models/')
        ? request.model.replace(/^models\//, '')
        : request.model;

      const response = await this.ai.models.generateContent({
        model: normalizedModel,
        contents: request.message,
      });

      if (!response.text) {
        throw new Error('A resposta do Gemini não contém texto.');
      }

      return response.text;
    } catch (error) {
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
      const models: Array<{
        name?: string;
        inputTokenLimit?: number;
        outputTokenLimit?: number;
        supportedGenerationMethods?: string[];
      }> = [];

      for await (const model of await this.ai.models.list()) {
        models.push(model);
      }

      return models
        .filter((model) => model.name)
        .map((model) => {
          const modelName = model.name!.replace(/^models\//, '');

          return {
            name: modelName,
            provider: 'gemini',
            model: modelName,
            size: 0,
            details: {
              family: 'gemini',
              families: ['gemini'],
              parameter_size: '',
              quantization_level: '',
              context_length: model.inputTokenLimit ?? 0,
              embedding_length: model.outputTokenLimit ?? 0,
            },
            capabilities: model.supportedGenerationMethods ?? [],
          };
        });
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
      const normalizedModel = model.startsWith('models/')
        ? model.replace(/^models\//, '')
        : model;

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
