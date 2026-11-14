import { BadRequestException } from '@nestjs/common';

import { MAX_CATEGORY_DEPTH } from './library.types';

const MAX_SLUG_LENGTH = 60;
const MAX_SEGMENT_LENGTH = 60;
const FILE_EXTENSION = '.md';

const RESERVED_NAMES = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  ...Array.from({ length: 9 }, (_, i) => `com${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `lpt${i + 1}`),
]);

// eslint-disable-next-line no-control-regex
const INVALID_FILE_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

const collator = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
});

/** Ordenação alfanumérica natural (pt-BR): "Aula 2" vem antes de "Aula 10". */
export function compareNatural(a: string, b: string): number {
  return collator.compare(a, b);
}

/** Chave para comparar nomes ignorando maiúsculas, acentos e espaços extras. */
export function normalizeKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Converte um título em um nome seguro de arquivo: `segunda_maneira`. */
export function slugify(text: string): string {
  const slug = normalizeKey(text)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/_+$/g, '');

  return slug || 'sem_titulo';
}

/** `<slug>_<id>` (sem extensão) — o slug primeiro faz o nome ordenar por tema. */
export function buildBaseName(title: string, id: string): string {
  return `${slugify(title)}_${id}`;
}

/** `<slug>_<id>.md` */
export function buildFileName(title: string, id: string): string {
  return `${buildBaseName(title, id)}${FILE_EXTENSION}`;
}

/**
 * Extrai slug e id do nome do arquivo. O slug usa `_` entre palavras e o id
 * (uuid) não tem `_`, então o id é tudo depois do último `_`.
 */
export function parseFileName(
  fileName: string,
): { slug: string; id: string } | null {
  if (!fileName.toLowerCase().endsWith(FILE_EXTENSION)) {
    return null;
  }

  const base = fileName.slice(0, -FILE_EXTENSION.length);
  const separator = base.lastIndexOf('_');

  if (separator <= 0 || separator === base.length - 1) {
    return null;
  }

  return { slug: base.slice(0, separator), id: base.slice(separator + 1) };
}

/**
 * Valida e normaliza um nível de categoria, que vira nome de pasta.
 * Mantém acentos e espaços, remove caracteres inválidos e rejeita nomes que
 * poderiam escapar da pasta (`..`) ou que o Windows reserva.
 */
export function sanitizeCategorySegment(name: string): string {
  const cleaned = name
    .replace(INVALID_FILE_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[. ]+|[. ]+$/g, '');

  if (cleaned === '' || /^\.+$/.test(cleaned)) {
    throw new BadRequestException('Nome de categoria inválido.');
  }

  if (cleaned.length > MAX_SEGMENT_LENGTH) {
    throw new BadRequestException(
      `Nome de categoria excede ${MAX_SEGMENT_LENGTH} caracteres.`,
    );
  }

  if (RESERVED_NAMES.has(normalizeKey(cleaned.split('.')[0]))) {
    throw new BadRequestException(`Nome de categoria reservado: ${cleaned}`);
  }

  return cleaned;
}

/**
 * Valida o caminho hierárquico (1 a 4 níveis) e sanitiza cada nível.
 */
export function sanitizeCategoryPath(path: string[]): string[] {
  if (path.length === 0 || path.length > MAX_CATEGORY_DEPTH) {
    throw new BadRequestException(
      `A categoria deve ter de 1 a ${MAX_CATEGORY_DEPTH} níveis.`,
    );
  }

  return path.map(sanitizeCategorySegment);
}
