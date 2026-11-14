import { Injectable } from '@nestjs/common';

import type { DocumentMeta } from '../domain/library.types';
import { normalizeKey } from '../domain/naming';
import { makePreview } from '../domain/preview';
import { LibraryStorage, type StoredDocument } from './library-storage';

export interface IndexedDocument {
  meta: DocumentMeta;
  path: string;
  fileName: string;
  /** Trecho curto do corpo, para listagens. */
  preview: string;
  /** Metadados normalizados (sem acento/caixa) para busca rápida. */
  searchKey: string;
}

export interface IndexError {
  file: string;
  message: string;
}

export interface RebuildResult {
  indexed: number;
  errors: IndexError[];
}

/**
 * Cache em memória só dos metadados (o corpo não é guardado). Os arquivos
 * Markdown continuam sendo a fonte da verdade; o índice é reconstruído deles.
 */
@Injectable()
export class LibraryIndex {
  private docs = new Map<string, IndexedDocument>();
  private indexErrors: IndexError[] = [];

  constructor(private readonly storage: LibraryStorage) {}

  get errors(): IndexError[] {
    return this.indexErrors;
  }

  get size(): number {
    return this.docs.size;
  }

  all(): IndexedDocument[] {
    return [...this.docs.values()];
  }

  get(id: string): IndexedDocument | undefined {
    return this.docs.get(id);
  }

  upsert(stored: StoredDocument): IndexedDocument {
    const indexed: IndexedDocument = {
      meta: stored.meta,
      path: stored.path,
      fileName: stored.fileName,
      preview: makePreview(stored.body),
      searchKey: normalizeKey(
        [
          stored.meta.title,
          stored.fileName,
          ...stored.meta.tags,
          ...stored.meta.category,
        ].join(' '),
      ),
    };

    this.docs.set(stored.meta.id, indexed);

    return indexed;
  }

  remove(id: string): void {
    this.docs.delete(id);
  }

  /**
   * Reconstrói o índice a partir dos arquivos da entrada e da biblioteca.
   * Arquivo inválido é ignorado e registrado em `errors`. Se o mesmo id
   * existir em dois arquivos (ex.: falha no meio de uma movimentação), vale
   * o mais recente e o outro é registrado como erro.
   */
  async rebuild(): Promise<RebuildResult> {
    const docs = new Map<string, IndexedDocument>();
    const errors: IndexError[] = [];

    const files = [
      ...(await this.storage.listMarkdownFiles(this.storage.inboxDir)),
      ...(await this.storage.listMarkdownFiles(this.storage.libDir)),
    ];

    const scratch = new LibraryIndex(this.storage);

    for (const file of files) {
      try {
        const indexed = scratch.upsert(await this.storage.read(file));
        const current = docs.get(indexed.meta.id);

        if (!current) {
          docs.set(indexed.meta.id, indexed);
          continue;
        }

        const newer = indexed.meta.updatedAt > current.meta.updatedAt;
        const loser = newer ? current : indexed;

        docs.set(indexed.meta.id, newer ? indexed : current);
        errors.push({
          file: loser.fileName,
          message: `Id duplicado (${indexed.meta.id}): mantido o arquivo mais recente.`,
        });
      } catch (error) {
        errors.push({
          file: file.split(/[\\/]/).pop() ?? file,
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    this.docs = docs;
    this.indexErrors = errors;

    return { indexed: docs.size, errors };
  }
}
