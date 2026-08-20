import { ApiProperty } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({
    example: 'Olá, tudo bem?',
  })
  message!: string;

  @ApiProperty({
    example: 'qwen3:1.7b',
  })
  model!: string;

  @ApiProperty({
    example: false,
    required: false,
  })
  think?: boolean;
}
