import { BadRequestException, Injectable } from '@nestjs/common';

import { startsWithCategory } from '../domain/categories';
import {
  DocumentSourceOptions,
  DocumentStatusOptions,
  DocumentTypeOptions,
  type DocumentMeta,
  type DocumentSource,
  type DocumentStatus,
  type DocumentType,
} from '../domain/library.types';
import { compareNatural, normalizeKey } from '../domain/naming';
import {
  LibraryIndex,
  type IndexedDocument,
} from '../infrastructure/library-index';
import { LibraryStorage } from '../infrastructure/library-storage';

export type SortOption = 'title' | 'recent';

export interface SearchFilters {
  q?: string;
  /** Caminho de categorias (qualquer nível): documentos dentro dele. */
  category?: string[];
  type?: string;
  source?: string;
  tags?: string[];
  status?: string;
  sort?: string;
}

export interface DocumentSummary extends DocumentMeta {
  fileName: string;
  preview: string;
  matchedIn?: 'metadata' | 'content';
}

const READ_CONCURRENCY = 8;

interface Match {
  doc: IndexedDocument;
  matchedIn?: 'metadata' | 'content';
}

@Injectable()
export class LibrarySearch {
  constructor(
    private readonly index: LibraryIndex,
    private readonly storage: LibraryStorage,
  ) {}

  /**
   * Filtra pelos metadados em memória e, quando há texto de busca, procura
   * também no conteúdo dos arquivos, lendo do disco só os que ainda não
   * casaram pelos metadados.
   */
  async search(filters: SearchFilters = {}): Promise<DocumentSummary[]> {
    const type = oneOf(filters.type, DocumentTypeOptions, 'tipo');
    const source = oneOf(filters.source, DocumentSourceOptions, 'origem');
    const status =
      oneOf(filters.status, DocumentStatusOptions, 'status') ??
      DocumentStatusOptions.PUBLISHED;
    const sort =
      oneOf(filters.sort, { title: 'title', recent: 'recent' }, 'ordenação') ??
      'title';

    const tagKeys = (filters.tags ?? []).map(normalizeKey);
    const category = filters.category ?? [];

    const candidates = this.index
      .all()
      .filter(
        (doc) =>
          doc.meta.status === status &&
          (!type || doc.meta.type === type) &&
          (!source || doc.meta.source === source) &&
          startsWithCategory(doc.meta.category, category) &&
          tagKeys.every((tag) =>
            doc.meta.tags.some((own) => normalizeKey(own) === tag),
          ),
      );

    const tokens = normalizeKey(filters.q ?? '')
      .split(' ')
      .filter(Boolean);

    const matches: Match[] =
      tokens.length === 0
        ? candidates.map((doc): Match => ({ doc }))
        : await this.matchText(candidates, tokens);

    const sorted = matches.sort((a, b) =>
      sort === 'recent'
        ? b.doc.meta.createdAt.localeCompare(a.doc.meta.createdAt)
        : compareNatural(a.doc.meta.title, b.doc.meta.title) ||
          compareNatural(a.doc.fileName, b.doc.fileName),
    );

    return sorted.map(({ doc, matchedIn }) => toSummary(doc, matchedIn));
  }

  private async matchText(
    candidates: IndexedDocument[],
    tokens: string[],
  ): Promise<Match[]> {
    const result: Match[] = [];
    const needContent: { doc: IndexedDocument; missing: string[] }[] = [];

    for (const doc of candidates) {
      const missing = tokens.filter((token) => !doc.searchKey.includes(token));

      if (missing.length === 0) {
        result.push({ doc, matchedIn: 'metadata' });
      } else {
        needContent.push({ doc, missing });
      }
    }

    for (let i = 0; i < needContent.length; i += READ_CONCURRENCY) {
      const batch = needContent.slice(i, i + READ_CONCURRENCY);

      const found = await Promise.all(
        batch.map(async ({ doc, missing }) => {
          try {
            const { body } = await this.storage.read(doc.path);
            const text = normalizeKey(body);

            return missing.every((token) => text.includes(token)) ? doc : null;
          } catch {
            return null;
          }
        }),
      );

      for (const doc of found) {
        if (doc) {
          result.push({ doc, matchedIn: 'content' });
        }
      }
    }

    return result;
  }
}

export function toSummary(
  doc: IndexedDocument,
  matchedIn?: 'metadata' | 'content',
): DocumentSummary {
  return {
    ...doc.meta,
    fileName: doc.fileName,
    preview: doc.preview,
    ...(matchedIn ? { matchedIn } : {}),
  };
}

function oneOf<T extends Record<string, string>>(
  value: string | undefined,
  options: T,
  label: string,
): T[keyof T] | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }

  if (!Object.values(options).includes(value)) {
    throw new BadRequestException(`Valor inválido para ${label}: ${value}`);
  }

  return value as T[keyof T];
}

export type { DocumentSource, DocumentStatus, DocumentType };
