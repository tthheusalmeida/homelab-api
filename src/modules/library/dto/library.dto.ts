import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LibraryQueryDto {
  @ApiPropertyOptional({
    description: 'Texto: título, nome do arquivo, tags, categorias e conteúdo',
  })
  q?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Caminho da categoria, repetindo o parâmetro por nível',
    example: ['Ciência da Computação', 'DevOps'],
  })
  category?: string | string[];

  @ApiPropertyOptional({ enum: ['summary', 'transcription', 'article'] })
  type?: string;

  @ApiPropertyOptional({ enum: ['video', 'manual'] })
  source?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Tags (todas precisam estar no documento)',
  })
  tag?: string | string[];

  @ApiPropertyOptional({
    enum: ['published', 'archived', 'pending'],
    default: 'published',
  })
  status?: string;

  @ApiPropertyOptional({ enum: ['title', 'recent'], default: 'title' })
  sort?: string;
}

export class PublishDocumentDto {
  @ApiPropertyOptional({ example: 'Práticas da Primeira Maneira' })
  title?: string;

  @ApiProperty({
    type: [String],
    example: ['Ciência da Computação', 'DevOps'],
    description: 'De 1 a 4 níveis, do mais amplo ao mais específico',
  })
  category!: string[];

  @ApiPropertyOptional({ type: [String], example: ['devops'] })
  tags?: string[];
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ example: 'Novo título' })
  title?: string;

  @ApiPropertyOptional({ type: [String], example: ['Química', 'Ligações'] })
  category?: string[];

  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @ApiPropertyOptional({ example: '# Título\n\nTexto em Markdown' })
  content?: string;
}

export class SuggestDocumentDto {
  @ApiPropertyOptional({
    example: 'gemini-3.1-flash-lite',
    description: 'Modelo do Gemini; sem ele usa o mais barato cadastrado',
  })
  modelId?: string;
}

export class CreateArticleDto {
  @ApiProperty({ example: 'Ligações Peptídicas' })
  title!: string;

  @ApiProperty({ type: [String], example: ['Química', 'Ligações'] })
  category!: string[];

  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @ApiProperty({ example: '# Título\n\nTexto em Markdown' })
  content!: string;
}

/** Aceita um valor ou uma lista (parâmetro de query repetido). */
export function toList(value: string | string[] | undefined): string[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

/** Garante que o campo do corpo é uma lista de textos. */
export function requireStringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new BadRequestException(
      `O campo "${field}" deve ser uma lista de textos.`,
    );
  }

  return value as string[];
}

export function optionalStringList(
  value: unknown,
  field: string,
): string[] | undefined {
  return value === undefined ? undefined : requireStringList(value, field);
}
