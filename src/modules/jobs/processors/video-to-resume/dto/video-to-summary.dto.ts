import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type AIProviderName } from 'src/modules/ai/ai.model';
import {
  SUMMARY_DETAILS,
  type SummaryDetail,
} from 'src/modules/ai/prompts/summary-specialist.prompt';

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

  @ApiPropertyOptional({
    enum: SUMMARY_DETAILS,
    example: 'detailed',
    description: 'Nível de detalhe do resumo (padrão: detailed).',
  })
  detail?: SummaryDetail;

  @ApiPropertyOptional({ example: 'Práticas da Primeira Maneira' })
  title?: string;

  @ApiPropertyOptional({ type: [String], example: ['Tecnologia', 'DevOps'] })
  category?: string[];

  @ApiPropertyOptional({ type: [String], example: ['devops'] })
  tags?: string[];
}
