import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';

import { uuidv7 } from 'uuidv7';

import { buildCategoryTree, type CategoryNode } from '../domain/categories';
import { normalizeTags } from '../domain/document';
import {
  DocumentSourceOptions,
  DocumentStatusOptions,
  DocumentTypeOptions,
  type DocumentMeta,
} from '../domain/library.types';
import { compareNatural, sanitizeCategoryPath } from '../domain/naming';
import {
  LibraryIndex,
  type IndexError,
  type IndexedDocument,
  type RebuildResult,
} from '../infrastructure/library-index';
import { LibraryStorage } from '../infrastructure/library-storage';
import {
  LibrarySearch,
  toSummary,
  type DocumentSummary,
  type SearchFilters,
} from './library-search';

export interface DocumentDetail {
  meta: DocumentMeta;
  content: string;
}

export interface PublishInput {
  title?: string;
  category: string[];
  tags?: string[];
}

export interface ArticleInput {
  title: string;
  category: string[];
  tags?: string[];
  content: string;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface IndexStatus {
  total: number;
  errors: IndexError[];
}

@Injectable()
export class LibraryService implements OnModuleInit {
  private readonly logger = new Logger(LibraryService.name);

  constructor(
    private readonly storage: LibraryStorage,
    private readonly index: LibraryIndex,
    private readonly search: LibrarySearch,
  ) {}

  /** Na inicialização, reconstrói o índice a partir dos arquivos. */
  async onModuleInit(): Promise<void> {
    try {
      const { indexed, errors } = await this.index.rebuild();

      this.logger.log(
        `Índice da biblioteca: ${indexed} documento(s), ${errors.length} erro(s).`,
      );
    } catch (error) {
      this.logger.error('Falha ao indexar a biblioteca.', error);
    }
  }

  reindex(): Promise<RebuildResult> {
    return this.index.rebuild();
  }

  indexStatus(): IndexStatus {
    return { total: this.index.size, errors: this.index.errors };
  }

  list(filters: SearchFilters): Promise<DocumentSummary[]> {
    return this.search.search(filters);
  }

  /** Documentos gerados aguardando decisão, do mais recente ao mais antigo. */
  inbox(): DocumentSummary[] {
    return this.index
      .all()
      .filter((doc) => doc.meta.status === DocumentStatusOptions.PENDING)
      .sort((a, b) => b.meta.createdAt.localeCompare(a.meta.createdAt))
      .map((doc) => toSummary(doc));
  }

  async get(id: string): Promise<DocumentDetail> {
    const indexed = this.find(id);
    const { meta, body } = await this.storage.read(indexed.path);

    return { meta, content: body };
  }

  /** Árvore de categorias só dos documentos publicados. */
  categories(): CategoryNode[] {
    return buildCategoryTree(this.published().map((doc) => doc.meta.category));
  }

  tags(): TagCount[] {
    const counts = new Map<string, TagCount>();

    for (const doc of this.published()) {
      for (const tag of doc.meta.tags) {
        const current = counts.get(tag);

        if (current) {
          current.count += 1;
        } else {
          counts.set(tag, { tag, count: 1 });
        }
      }
    }

    return [...counts.values()].sort((a, b) => compareNatural(a.tag, b.tag));
  }

  /**
   * Adiciona à biblioteca um documento pendente ou arquivado: define título,
   * categoria (1 a 4 níveis) e tags, move o arquivo para a pasta da
   * categoria e, se estava na entrada, apaga de lá.
   */
  async publish(id: string, input: PublishInput): Promise<DocumentDetail> {
    const indexed = this.find(id);

    if (indexed.meta.status === DocumentStatusOptions.PUBLISHED) {
      throw new BadRequestException('O documento já está na biblioteca.');
    }

    const { meta: current, body } = await this.storage.read(indexed.path);

    const meta: DocumentMeta = {
      ...current,
      title:
        input.title === undefined ? current.title : cleanTitle(input.title),
      category: sanitizeCategoryPath(input.category),
      tags: normalizeTags(input.tags ?? current.tags),
      status: DocumentStatusOptions.PUBLISHED,
      updatedAt: new Date().toISOString(),
    };

    await this.persist(meta, body, indexed.path);

    return { meta, content: body };
  }

  /**
   * Remoção lógica: o arquivo continua em `lib/`, mas deixa de aparecer na
   * biblioteca. Pode ser readicionado com `publish`.
   */
  async archive(id: string): Promise<DocumentDetail> {
    const indexed = this.find(id);

    if (indexed.meta.status !== DocumentStatusOptions.PUBLISHED) {
      throw new BadRequestException(
        'Só é possível remover da biblioteca um documento publicado.',
      );
    }

    const { meta: current, body } = await this.storage.read(indexed.path);

    const meta: DocumentMeta = {
      ...current,
      status: DocumentStatusOptions.ARCHIVED,
      updatedAt: new Date().toISOString(),
    };

    await this.persist(meta, body, indexed.path);

    return { meta, content: body };
  }

  /** Apaga de verdade. Só pendentes e arquivados (publicado: arquive antes). */
  async discard(id: string): Promise<void> {
    const indexed = this.find(id);

    if (indexed.meta.status === DocumentStatusOptions.PUBLISHED) {
      throw new BadRequestException(
        'Remova o documento da biblioteca antes de descartá-lo.',
      );
    }

    await this.storage.remove(indexed.path);
    this.index.remove(id);
  }

  /** Cria um artigo escrito manualmente, já publicado. */
  async createArticle(input: ArticleInput): Promise<DocumentDetail> {
    const title = cleanTitle(input.title);

    if (typeof input.content !== 'string' || input.content.trim() === '') {
      throw new BadRequestException('O conteúdo do artigo é obrigatório.');
    }

    const now = new Date().toISOString();

    const meta: DocumentMeta = {
      id: uuidv7(),
      title,
      type: DocumentTypeOptions.ARTICLE,
      source: DocumentSourceOptions.MANUAL,
      status: DocumentStatusOptions.PUBLISHED,
      category: sanitizeCategoryPath(input.category),
      tags: normalizeTags(input.tags ?? []),
      createdAt: now,
      updatedAt: now,
    };

    await this.persist(meta, input.content);

    return { meta, content: input.content.trim() };
  }

  /**
   * Grava o documento e atualiza o índice. Se o arquivo mudou de lugar ou de
   * nome, apaga o antigo só depois de gravar o novo (nunca perde conteúdo).
   */
  private async persist(
    meta: DocumentMeta,
    body: string,
    previousPath?: string,
  ): Promise<void> {
    const newPath = await this.storage.save(meta, body);

    if (previousPath && previousPath !== newPath) {
      await this.storage.remove(previousPath);
    }

    this.index.upsert(await this.storage.read(newPath));
  }

  private find(id: string): IndexedDocument {
    const indexed = this.index.get(id);

    if (!indexed) {
      throw new NotFoundException(`Documento "${id}" não encontrado.`);
    }

    return indexed;
  }

  private published(): IndexedDocument[] {
    return this.index
      .all()
      .filter((doc) => doc.meta.status === DocumentStatusOptions.PUBLISHED);
  }
}

function cleanTitle(title: unknown): string {
  if (typeof title !== 'string' || title.trim() === '') {
    throw new BadRequestException('O título é obrigatório.');
  }

  return title.trim();
}
