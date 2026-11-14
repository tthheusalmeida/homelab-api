import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  BookValidationError,
  bookDocumentIds,
  cleanBookTitle,
  cleanCoverColor,
  cleanCoverImageUrl,
  cleanSubtitle,
  isBookKind,
  newBook,
  normalizeModules,
  type Book,
  type BookCoverColor,
  type BookKind,
  type ModuleInput,
} from '../domain/book';
import { DocumentStatusOptions } from '../domain/library.types';
import { compareNatural, normalizeKey } from '../domain/naming';
import { BookStorage } from '../infrastructure/book-storage';
import { LibraryIndex } from '../infrastructure/library-index';
import { LibraryService } from './library.service';

export interface BookSummary {
  id: string;
  title: string;
  kind: BookKind;
  description: string;
  subtitle: string;
  coverColor: BookCoverColor;
  coverImageUrl: string;
  chapterCount: number;
  moduleCount: number;
  updatedAt: string;
  /** Só quando a lista é pedida para um documento: ele já está no livro? */
  containsDocument?: boolean;
}

export interface BookChapter {
  documentId: string;
  title: string;
  category: string[];
  /** `false` quando o documento foi removido da biblioteca ou apagado. */
  available: boolean;
}

export interface BookDetail extends Omit<Book, 'modules'> {
  modules: {
    id: string;
    title: string;
    chapters: BookChapter[];
  }[];
}

export interface BookReading {
  book: Omit<Book, 'modules'>;
  modules: {
    id: string;
    title: string;
    chapters: (BookChapter & { content: string })[];
  }[];
}

export interface BookSearchHit {
  documentId: string;
  chapterTitle: string;
  moduleId: string;
  moduleTitle: string;
  /** Linha (base 1) do trecho dentro do documento. */
  line: number;
  snippet: string;
}

const MAX_HITS_PER_CHAPTER = 3;
const MAX_HITS = 50;
const SNIPPET_RADIUS = 80;

@Injectable()
export class BookService {
  constructor(
    private readonly storage: BookStorage,
    private readonly index: LibraryIndex,
    private readonly library: LibraryService,
  ) {}

  async list(documentId?: string): Promise<BookSummary[]> {
    const books = await this.storage.list();

    return books
      .map((book): BookSummary => {
        const ids = bookDocumentIds(book);

        return {
          id: book.id,
          title: book.title,
          kind: book.kind,
          description: book.description,
          subtitle: book.subtitle,
          coverColor: book.coverColor,
          coverImageUrl: book.coverImageUrl,
          chapterCount: ids.length,
          moduleCount: book.modules.length,
          updatedAt: book.updatedAt,
          ...(documentId === undefined
            ? {}
            : { containsDocument: ids.includes(documentId) }),
        };
      })
      .sort((a, b) => compareNatural(a.title, b.title));
  }

  async create(input: {
    title: unknown;
    kind?: unknown;
    description?: unknown;
    subtitle?: unknown;
    coverColor?: unknown;
    coverImageUrl?: unknown;
  }): Promise<BookDetail> {
    const book = this.guard(() =>
      newBook({
        title: cleanBookTitle(input.title),
        kind: this.kindOf(input.kind),
        description:
          typeof input.description === 'string' ? input.description : '',
        subtitle: cleanSubtitle(input.subtitle),
        coverColor: cleanCoverColor(input.coverColor),
        coverImageUrl: cleanCoverImageUrl(input.coverImageUrl),
      }),
    );

    await this.storage.save(book);

    return this.detail(book);
  }

  async get(id: string): Promise<BookDetail> {
    return this.detail(await this.load(id));
  }

  async update(
    id: string,
    input: {
      title?: unknown;
      kind?: unknown;
      description?: unknown;
      subtitle?: unknown;
      coverColor?: unknown;
      coverImageUrl?: unknown;
    },
  ): Promise<BookDetail> {
    const book = await this.load(id);

    const next: Book = this.guard(() => ({
      ...book,
      title:
        input.title === undefined ? book.title : cleanBookTitle(input.title),
      kind: this.kindOf(input.kind) ?? book.kind,
      description:
        input.description === undefined
          ? book.description
          : typeof input.description === 'string'
            ? input.description.trim()
            : book.description,
      subtitle:
        input.subtitle === undefined
          ? book.subtitle
          : cleanSubtitle(input.subtitle),
      coverColor:
        input.coverColor === undefined
          ? book.coverColor
          : cleanCoverColor(input.coverColor),
      coverImageUrl:
        input.coverImageUrl === undefined
          ? book.coverImageUrl
          : cleanCoverImageUrl(input.coverImageUrl),
      updatedAt: new Date().toISOString(),
    }));

    await this.storage.save(next);

    return this.detail(next);
  }

  async remove(id: string): Promise<void> {
    if (!(await this.storage.remove(id))) {
      throw new NotFoundException('Livro não encontrado.');
    }
  }

  /**
   * Troca a estrutura inteira (ordem e módulos). Todo documento precisa estar
   * publicado, exceto os que já estavam no livro (para o usuário poder tirar
   * os indisponíveis sem ser barrado por eles).
   */
  async setStructure(id: string, modules: ModuleInput[]): Promise<BookDetail> {
    const book = await this.load(id);
    const normalized = this.guard(() => normalizeModules(modules));
    const already = new Set(bookDocumentIds(book));

    for (const documentId of normalized.flatMap((m) => m.documentIds)) {
      if (!already.has(documentId) && !this.isPublished(documentId)) {
        throw new BadRequestException(
          `O documento ${documentId} não está na biblioteca.`,
        );
      }
    }

    const next: Book = {
      ...book,
      modules: normalized,
      updatedAt: new Date().toISOString(),
    };

    await this.storage.save(next);

    return this.detail(next);
  }

  /** Acrescenta um documento ao fim de um módulo (padrão: o último). */
  async addChapter(
    id: string,
    documentId: string,
    moduleId?: string,
  ): Promise<BookDetail> {
    const book = await this.load(id);

    if (typeof documentId !== 'string' || !this.isPublished(documentId)) {
      throw new BadRequestException('O documento não está na biblioteca.');
    }

    if (bookDocumentIds(book).includes(documentId)) {
      throw new BadRequestException('O documento já está neste livro.');
    }

    const target =
      moduleId === undefined
        ? book.modules[book.modules.length - 1]
        : book.modules.find((module) => module.id === moduleId);

    if (!target) {
      throw new BadRequestException('Módulo não encontrado neste livro.');
    }

    const next: Book = {
      ...book,
      modules: book.modules.map((module) =>
        module.id === target.id
          ? { ...module, documentIds: [...module.documentIds, documentId] }
          : module,
      ),
      updatedAt: new Date().toISOString(),
    };

    await this.storage.save(next);

    return this.detail(next);
  }

  /** O livro inteiro, na ordem, para a leitura contínua. Pula os indisponíveis. */
  async read(id: string): Promise<BookReading> {
    const book = await this.load(id);
    const { modules, ...meta } = book;

    const result: BookReading['modules'] = [];

    for (const module of modules) {
      const chapters: BookReading['modules'][number]['chapters'] = [];

      for (const documentId of module.documentIds) {
        if (!this.isPublished(documentId)) {
          continue;
        }

        const { meta: docMeta, content } = await this.library.get(documentId);

        chapters.push({
          documentId,
          title: docMeta.title,
          category: docMeta.category,
          available: true,
          content,
        });
      }

      result.push({ id: module.id, title: module.title, chapters });
    }

    return { book: meta, modules: result };
  }

  /**
   * Procura dentro do texto dos capítulos. Uma linha casa quando tem todas as
   * palavras (sem diferenciar maiúscula nem acento). Devolve o capítulo, a
   * linha e um trecho para o front rolar até o ponto.
   */
  async search(id: string, query: string): Promise<BookSearchHit[]> {
    const words = normalizeKey(query ?? '')
      .split(' ')
      .filter((word) => word !== '');

    if (words.length === 0) {
      return [];
    }

    const reading = await this.read(id);
    const hits: BookSearchHit[] = [];

    for (const module of reading.modules) {
      for (const chapter of module.chapters) {
        let inChapter = 0;

        for (const [index, line] of chapter.content.split(/\r?\n/).entries()) {
          if (inChapter >= MAX_HITS_PER_CHAPTER) {
            break;
          }

          const found = findSnippet(line, words);

          if (found === null) {
            continue;
          }

          hits.push({
            documentId: chapter.documentId,
            chapterTitle: chapter.title,
            moduleId: module.id,
            moduleTitle: module.title,
            line: index + 1,
            snippet: found,
          });
          inChapter += 1;

          if (hits.length >= MAX_HITS) {
            return hits;
          }
        }
      }
    }

    return hits;
  }

  private async load(id: string): Promise<Book> {
    const book = await this.storage.find(id);

    if (!book) {
      throw new NotFoundException('Livro não encontrado.');
    }

    return book;
  }

  private isPublished(documentId: string): boolean {
    return (
      this.index.get(documentId)?.meta.status ===
      DocumentStatusOptions.PUBLISHED
    );
  }

  private kindOf(kind: unknown): BookKind | undefined {
    if (kind === undefined) {
      return undefined;
    }

    if (!isBookKind(kind)) {
      throw new BookValidationError('Tipo de livro inválido.');
    }

    return kind;
  }

  private detail(book: Book): BookDetail {
    return {
      ...book,
      modules: book.modules.map((module) => ({
        id: module.id,
        title: module.title,
        chapters: module.documentIds.map((documentId): BookChapter => {
          const indexed = this.index.get(documentId);
          const available =
            indexed?.meta.status === DocumentStatusOptions.PUBLISHED;

          return {
            documentId,
            title: available ? indexed.meta.title : 'Documento indisponível',
            category: available ? indexed.meta.category : [],
            available,
          };
        }),
      })),
    };
  }

  private guard<T>(action: () => T): T {
    try {
      return action();
    } catch (error) {
      if (error instanceof BookValidationError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }
}

/** Trecho de uma linha ao redor da primeira palavra, se ela tiver todas. */
function findSnippet(line: string, words: string[]): string | null {
  const plain = line
    .replace(/^#{1,6}\s+/, '')
    .replace(/[*`_>|]/g, '')
    .trim();
  const normalized = normalizeKey(plain);

  if (!words.every((word) => normalized.includes(word))) {
    return null;
  }

  // normalizeKey pode encurtar o texto (acentos decompostos); a posição só é
  // usada como referência aproximada para o recorte.
  const at = Math.max(0, normalized.indexOf(words[0]));
  const start = Math.max(0, at - SNIPPET_RADIUS);
  const end = Math.min(plain.length, at + SNIPPET_RADIUS);

  return `${start > 0 ? '…' : ''}${plain.slice(start, end).trim()}${
    end < plain.length ? '…' : ''
  }`;
}
