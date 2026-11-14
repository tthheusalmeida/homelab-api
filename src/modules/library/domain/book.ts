import { uuidv7 } from 'uuidv7';

export const BOOK_KINDS = ['pos', 'course', 'study', 'book'] as const;

export type BookKind = (typeof BOOK_KINDS)[number];

export const DEFAULT_BOOK_KIND: BookKind = 'study';

/** Cores da capa (o front mapeia cada nome para um degradê). */
export const BOOK_COVER_COLORS = [
  'blue',
  'emerald',
  'violet',
  'amber',
  'rose',
  'slate',
] as const;

export type BookCoverColor = (typeof BOOK_COVER_COLORS)[number];

export const DEFAULT_COVER_COLOR: BookCoverColor = 'blue';

export interface BookModule {
  id: string;
  /** Vazio = capítulos soltos, sem cabeçalho de módulo. */
  title: string;
  documentIds: string[];
}

/** Último ponto lido de um livro: o capítulo e o elemento (título) na tela. */
export interface BookPosition {
  documentId: string;
  elementId: string;
}

/**
 * Um livro é só uma lista ordenada de documentos que já existem, agrupados em
 * módulos. O conteúdo continua nos documentos.
 */
export interface Book {
  id: string;
  title: string;
  kind: BookKind;
  description: string;
  /** Linha abaixo do título na capa (opcional). */
  subtitle: string;
  coverColor: BookCoverColor;
  /** URL http(s) de uma imagem para a capa; vazio = só a cor. */
  coverImageUrl: string;
  /** Ids dos documentos (capítulos) que o usuário marcou como lidos. */
  readDocumentIds: string[];
  /** Último ponto lido, para "continuar de onde parou". */
  lastPosition: BookPosition | null;
  /** Quando o último capítulo foi lido (livro "concluído"); null se não está completo. */
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  modules: BookModule[];
}

export interface ModuleInput {
  id?: string;
  title?: string;
  documentIds: string[];
}

export class BookValidationError extends Error {}

export function isBookKind(value: unknown): value is BookKind {
  return BOOK_KINDS.includes(value as BookKind);
}

export function isCoverColor(value: unknown): value is BookCoverColor {
  return BOOK_COVER_COLORS.includes(value as BookCoverColor);
}

/** Cor da capa; ausente vale o padrão, valor desconhecido dá erro. */
export function cleanCoverColor(value: unknown): BookCoverColor {
  if (value === undefined || value === null) {
    return DEFAULT_COVER_COLOR;
  }

  if (!isCoverColor(value)) {
    throw new BookValidationError('Cor de capa inválida.');
  }

  return value;
}

/** URL da imagem da capa: vazia limpa; senão precisa ser http(s) válida. */
export function cleanCoverImageUrl(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new BookValidationError(
      'A imagem da capa deve ser uma URL http(s) válida.',
    );
  }

  const url = value.trim();

  if (url === '') {
    return '';
  }

  try {
    const parsed = new URL(url);

    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    // cai no erro abaixo
  }

  throw new BookValidationError(
    'A imagem da capa deve ser uma URL http(s) válida.',
  );
}

export function cleanSubtitle(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function newBook(
  input: {
    title: string;
    kind?: BookKind;
    description?: string;
    subtitle?: string;
    coverColor?: BookCoverColor;
    coverImageUrl?: string;
  },
  now = new Date(),
): Book {
  const iso = now.toISOString();

  return {
    id: uuidv7(),
    title: cleanBookTitle(input.title),
    kind: input.kind ?? DEFAULT_BOOK_KIND,
    description: (input.description ?? '').trim(),
    subtitle: cleanSubtitle(input.subtitle),
    coverColor: cleanCoverColor(input.coverColor),
    coverImageUrl: cleanCoverImageUrl(input.coverImageUrl),
    readDocumentIds: [],
    lastPosition: null,
    completedAt: null,
    createdAt: iso,
    updatedAt: iso,
    modules: [{ id: uuidv7(), title: '', documentIds: [] }],
  };
}

export function cleanBookTitle(title: unknown): string {
  if (typeof title !== 'string' || title.trim() === '') {
    throw new BookValidationError('O título do livro não pode ficar vazio.');
  }

  return title.trim().replace(/\s+/g, ' ');
}

/**
 * Normaliza os módulos recebidos: apara títulos, descarta ids de documento
 * inválidos, gera ids que faltam e impede o mesmo documento duas vezes no
 * livro. Sempre devolve pelo menos um módulo.
 */
export function normalizeModules(input: ModuleInput[]): BookModule[] {
  if (!Array.isArray(input)) {
    throw new BookValidationError('Os módulos devem ser uma lista.');
  }

  const usedModuleIds = new Set<string>();
  const seenDocuments = new Set<string>();

  const modules = input.map((module) => {
    const documentIds = (module?.documentIds ?? []).filter(
      (id): id is string => typeof id === 'string' && id.trim() !== '',
    );

    for (const id of documentIds) {
      if (seenDocuments.has(id)) {
        throw new BookValidationError(
          'Um documento só pode aparecer uma vez no livro.',
        );
      }

      seenDocuments.add(id);
    }

    const wanted =
      typeof module?.id === 'string' && module.id.trim() !== ''
        ? module.id
        : uuidv7();
    const id = usedModuleIds.has(wanted) ? uuidv7() : wanted;

    usedModuleIds.add(id);

    return {
      id,
      title: typeof module?.title === 'string' ? module.title.trim() : '',
      documentIds,
    };
  });

  return modules.length > 0
    ? modules
    : [{ id: uuidv7(), title: '', documentIds: [] }];
}

export function bookDocumentIds(book: Book): string[] {
  return book.modules.flatMap((module) => module.documentIds);
}

/** Valida o ponto de leitura enviado pelo front. */
export function cleanPosition(value: unknown): BookPosition {
  const position = value as Partial<BookPosition> | null;

  if (
    !position ||
    typeof position.documentId !== 'string' ||
    position.documentId.trim() === '' ||
    typeof position.elementId !== 'string' ||
    position.elementId.trim() === '' ||
    position.elementId.length > 200
  ) {
    throw new BookValidationError('Posição de leitura inválida.');
  }

  return { documentId: position.documentId, elementId: position.elementId };
}

/** Zera o progresso: nenhum capítulo lido, sem posição e sem conclusão. */
export function resetProgress(book: Book): Book {
  return {
    ...book,
    readDocumentIds: [],
    lastPosition: null,
    completedAt: null,
  };
}

/** Marca (ou desmarca) um capítulo como lido, sem repetir. */
export function setRead(book: Book, documentId: string, read: boolean): Book {
  const others = book.readDocumentIds.filter((id) => id !== documentId);

  return { ...book, readDocumentIds: read ? [...others, documentId] : others };
}

/**
 * Deixa o progresso coerente com a estrutura atual: descarta lidos e posição
 * de capítulos que saíram do livro e recalcula a conclusão. O livro está
 * concluído quando todos os capítulos disponíveis foram lidos (há pelo menos
 * um); a data da conclusão é mantida enquanto ele continuar completo.
 */
export function withProgress(
  book: Book,
  isAvailable: (documentId: string) => boolean,
  now = new Date(),
): Book {
  const inBook = new Set(bookDocumentIds(book));
  const read = book.readDocumentIds.filter((id) => inBook.has(id));
  const available = [...inBook].filter(isAvailable);
  const complete =
    available.length > 0 && available.every((id) => read.includes(id));

  return {
    ...book,
    readDocumentIds: read,
    lastPosition:
      book.lastPosition && inBook.has(book.lastPosition.documentId)
        ? book.lastPosition
        : null,
    completedAt: complete ? (book.completedAt ?? now.toISOString()) : null,
  };
}

/** Valida o JSON lido do disco; erro descritivo se estiver inconsistente. */
export function parseBook(raw: unknown): Book {
  const value = raw as Partial<Book> | null;

  if (
    !value ||
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    !isBookKind(value.kind) ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    !Array.isArray(value.modules)
  ) {
    throw new BookValidationError('Arquivo de livro inválido.');
  }

  return {
    id: value.id,
    title: value.title,
    kind: value.kind,
    description: typeof value.description === 'string' ? value.description : '',
    // Livros salvos antes da capa existir não têm estes campos.
    subtitle: cleanSubtitle(value.subtitle),
    coverColor: isCoverColor(value.coverColor)
      ? value.coverColor
      : DEFAULT_COVER_COLOR,
    coverImageUrl:
      typeof value.coverImageUrl === 'string' ? value.coverImageUrl : '',
    // Livros salvos antes do progresso existir não têm estes campos.
    readDocumentIds: Array.isArray(value.readDocumentIds)
      ? [
          ...new Set(
            value.readDocumentIds.filter(
              (id): id is string => typeof id === 'string' && id !== '',
            ),
          ),
        ]
      : [],
    lastPosition: parsePosition(value.lastPosition),
    completedAt:
      typeof value.completedAt === 'string' ? value.completedAt : null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    modules: normalizeModules(value.modules),
  };
}

/** Posição salva no arquivo; qualquer coisa fora do formato vira "sem posição". */
function parsePosition(value: unknown): BookPosition | null {
  try {
    return cleanPosition(value);
  } catch {
    return null;
  }
}
