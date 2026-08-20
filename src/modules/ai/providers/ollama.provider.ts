import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import type { AIProvider } from '../ai.model';

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
}
