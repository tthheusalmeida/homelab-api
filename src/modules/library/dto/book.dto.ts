import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  BOOK_COVER_COLORS,
  BOOK_KINDS,
  type BookCoverColor,
  type BookKind,
} from '../domain/book';

export class CreateBookDto {
  @ApiProperty({ example: 'Pós em DevOps' })
  title!: string;

  @ApiPropertyOptional({ enum: BOOK_KINDS, default: 'study' })
  kind?: BookKind;

  @ApiPropertyOptional({ example: 'Resumos das aulas da pós' })
  description?: string;

  @ApiPropertyOptional({ example: 'Resumos das aulas' })
  subtitle?: string;

  @ApiPropertyOptional({ enum: BOOK_COVER_COLORS, default: 'blue' })
  coverColor?: BookCoverColor;

  @ApiPropertyOptional({
    example: 'https://exemplo.com/capa.jpg',
    description: 'URL http(s) da imagem da capa; vazio remove a imagem',
  })
  coverImageUrl?: string;
}

export class UpdateBookDto {
  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional({ enum: BOOK_KINDS })
  kind?: BookKind;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Resumos das aulas' })
  subtitle?: string;

  @ApiPropertyOptional({ enum: BOOK_COVER_COLORS, default: 'blue' })
  coverColor?: BookCoverColor;

  @ApiPropertyOptional({
    example: 'https://exemplo.com/capa.jpg',
    description: 'URL http(s) da imagem da capa; vazio remove a imagem',
  })
  coverImageUrl?: string;
}

export class BookModuleDto {
  @ApiPropertyOptional({ description: 'Sem id, o módulo ganha um novo' })
  id?: string;

  @ApiPropertyOptional({ example: 'Módulo 1 – Fundamentos' })
  title?: string;

  @ApiProperty({ type: [String], description: 'Ids dos documentos, em ordem' })
  documentIds!: string[];
}

export class SetStructureDto {
  @ApiProperty({ type: [BookModuleDto] })
  modules!: BookModuleDto[];
}

export class SetReadDto {
  @ApiProperty({
    description: 'true marca o capítulo como lido; false desmarca',
  })
  read!: boolean;
}

export class SavePositionDto {
  @ApiProperty()
  documentId!: string;

  @ApiProperty({ description: 'Id do elemento (título ou capítulo) na tela' })
  elementId!: string;
}

export class AddChapterDto {
  @ApiProperty()
  documentId!: string;

  @ApiPropertyOptional({ description: 'Sem módulo, entra no último' })
  moduleId?: string;
}
