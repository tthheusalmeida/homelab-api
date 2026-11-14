import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type AIProviderName } from 'src/modules/ai/ai.model';

export class VideoToSummaryDto {
  @ApiProperty({
    example:
      'https://ai.azure.com/speechassetscache/ttsvoice/VideoTranslation/PublicDoc/SampleData/es-ES-TryOutOriginal.mp4',
  })
  url!: string;

  @ApiProperty({
    example: 'ollama',
  })
  providerId!: AIProviderName;

  @ApiProperty({
    example: 'qwen3.5:1.7b',
  })
  modelId!: string;

  @ApiProperty({
    example: 'off',
  })
  thinking?: string;

  @ApiPropertyOptional({ example: 'Práticas da Primeira Maneira' })
  title?: string;

  @ApiPropertyOptional({ type: [String], example: ['Tecnologia', 'DevOps'] })
  category?: string[];

  @ApiPropertyOptional({ type: [String], example: ['devops'] })
  tags?: string[];
}
