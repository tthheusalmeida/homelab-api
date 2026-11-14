import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VideoToTranscriptDownloadDto {
  @ApiProperty({
    example:
      'https://ai.azure.com/speechassetscache/ttsvoice/VideoTranslation/PublicDoc/SampleData/es-ES-TryOutOriginal.mp4',
  })
  url!: string;

  @ApiPropertyOptional({ example: 'Aula 3 - Containers' })
  title?: string;

  @ApiPropertyOptional({ type: [String], example: ['Tecnologia', 'DevOps'] })
  category?: string[];

  @ApiPropertyOptional({ type: [String], example: ['docker'] })
  tags?: string[];
}
