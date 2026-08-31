import { ApiProperty } from '@nestjs/swagger';

export class VideoTranscriptDownloadDto {
  @ApiProperty({
    example:
      'https://ai.azure.com/speechassetscache/ttsvoice/VideoTranslation/PublicDoc/SampleData/es-ES-TryOutOriginal.mp4',
  })
  url!: string;
}
