import {
  DocumentSourceOptions,
  DocumentStatusOptions,
  type DocumentMeta,
  type DocumentSource,
  type DocumentType,
} from './library.types';

import { normalizeKey } from './naming';

interface NewPendingMetaInput {
  id: string;
  title: string;
  type: DocumentType;
  source?: DocumentSource;
  sourceUrl?: string;
  category?: string[];
  tags?: string[];
  now?: Date;
}

/**
 * Metadados de um documento recém-gerado, ainda na pasta de entrada
 * (pendente: sem decisão de entrar na biblioteca).
 */
export function newPendingMeta(input: NewPendingMetaInput): DocumentMeta {
  const timestamp = (input.now ?? new Date()).toISOString();

  return {
    id: input.id,
    title: input.title.trim(),
    type: input.type,
    source: input.source ?? DocumentSourceOptions.VIDEO,
    ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
    status: DocumentStatusOptions.PENDING,
    category: input.category ?? [],
    tags: normalizeTags(input.tags ?? []),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** Tags em minúsculas, sem espaços nas pontas, sem vazias nem duplicadas. */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of tags) {
    const cleaned = tag.trim().toLowerCase();
    const key = normalizeKey(cleaned);

    if (cleaned === '' || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(cleaned);
  }

  return result;
}
