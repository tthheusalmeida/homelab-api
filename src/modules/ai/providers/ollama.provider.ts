import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import type { AIProvider, AIProviderModel } from '../ai.model';

import { hasProperty, isObject, isString } from 'src/utils/type-guards';

import {
  HealthStatus,
  HealthStatusOptions,
} from 'src/modules/health/health.model';

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
  private readonly baseUrl = 'http://localhost:11434';

  constructor(private readonly httpService: HttpService) {}

  async health(): Promise<HealthStatus> {
    try {
      await firstValueFrom(this.httpService.get(`${this.baseUrl}/api/tags`));

      return {
        status: HealthStatusOptions.OK,
        service: 'ollama',
      };
    } catch {
      return {
        status: HealthStatusOptions.ERROR,
        service: 'ollama',
      };
    }
  }

  async chat(message: string, model: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/chat`, {
          model,
          messages: [
            {
              role: 'user',
              content: message,
            },
          ],
          stream: false,
        }),
      );

      return parseOllamaChatResponse(response.data);
    } catch (error) {
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

      return parseOllamaModelsResponse(response.data);
    } catch (error) {
      throw new Error('A requisição para listar modelos do Ollama falhou.', {
        cause: error,
      });
    }
  }
}
