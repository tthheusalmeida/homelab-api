import { BadRequestException } from '@nestjs/common';

import { normalizeTags } from 'src/modules/library/domain/document';
import { sanitizeCategoryPath } from 'src/modules/library/domain/naming';

const MAX_TITLE_CHARS = 120;

/** Dados opcionais informados na criação do job para o documento gerado. */
export interface DocumentHints {
  title?: string;
  category?: string[];
  tags?: string[];
}

interface RawHints {
  title?: unknown;
  category?: unknown;
  tags?: unknown;
}

function asStringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new BadRequestException(
      `O campo "${field}" deve ser uma lista de textos.`,
    );
  }

  return value as string[];
}

/**
 * Valida e normaliza título, categoria e tags opcionais. Campo ausente ou em
 * branco vira `undefined`; categoria inválida (mais de 4 níveis, nome
 * reservado etc.) dá 400 na hora, em vez de falhar depois com o job rodando.
 */
export function parseDocumentHints(raw: RawHints): DocumentHints {
  const hints: DocumentHints = {};

  if (raw.title !== undefined && raw.title !== null) {
    if (typeof raw.title !== 'string') {
      throw new BadRequestException('O campo "title" deve ser um texto.');
    }

    const title = raw.title.replace(/\s+/g, ' ').trim();

    if (title.length > MAX_TITLE_CHARS) {
      throw new BadRequestException(
        `O título excede ${MAX_TITLE_CHARS} caracteres.`,
      );
    }

    if (title !== '') {
      hints.title = title;
    }
  }

  if (raw.category !== undefined && raw.category !== null) {
    const levels = asStringList(raw.category, 'category')
      .map((name) => name.trim())
      .filter((name) => name !== '');

    if (levels.length > 0) {
      hints.category = sanitizeCategoryPath(levels);
    }
  }

  if (raw.tags !== undefined && raw.tags !== null) {
    const tags = normalizeTags(asStringList(raw.tags, 'tags'));

    if (tags.length > 0) {
      hints.tags = tags;
    }
  }

  return hints;
}
