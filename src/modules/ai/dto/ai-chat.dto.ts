import { ApiProperty } from '@nestjs/swagger';
import type { AIProviderName } from '../ai.model';

export class AiChatDto {
  @ApiProperty({
    example: 'Olá, tudo bem?',
  })
  message!: string;

  @ApiProperty({
    example: 'qwen3:1.7b',
  })
  modelId!: string;

  @ApiProperty({
    example: 'ollama',
  })
  providerId!: AIProviderName;

  @ApiProperty({
    example: 'off',
    required: false,
  })
  thinking?: string;
}
