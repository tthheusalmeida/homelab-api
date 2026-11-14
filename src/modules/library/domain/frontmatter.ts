import { parse, stringify } from 'yaml';

import { isObject } from 'src/utils/type-guards';

import {
  DocumentSourceOptions,
  DocumentStatusOptions,
  DocumentTypeOptions,
  MAX_CATEGORY_DEPTH,
  type DocumentMeta,
} from './library.types';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

const types = Object.values(DocumentTypeOptions) as string[];
const sources = Object.values(DocumentSourceOptions) as string[];
const statuses = Object.values(DocumentStatusOptions) as string[];

export interface ParsedDocument {
  meta: DocumentMeta;
  body: string;
}

/** Gera o arquivo Markdown: YAML frontmatter + corpo. */
export function serializeDocument(meta: DocumentMeta, body: string): string {
  const ordered = {
    id: meta.id,
    title: meta.title,
    type: meta.type,
    source: meta.source,
    ...(meta.sourceUrl ? { sourceUrl: meta.sourceUrl } : {}),
    status: meta.status,
    category: meta.category,
    tags: meta.tags,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
  };

  // Strings sempre entre aspas: evita que um id como 123456 vire número.
  const yaml = stringify(ordered, {
    defaultStringType: 'QUOTE_DOUBLE',
    defaultKeyType: 'PLAIN',
  });

  return `---\n${yaml}---\n\n${body.trim()}\n`;
}

/**
 * Lê um arquivo Markdown com frontmatter. Lança erro descritivo se o
 * cabeçalho estiver ausente ou inválido.
 */
export function parseDocument(raw: string): ParsedDocument {
  const match = FRONTMATTER.exec(raw);

  if (!match) {
    throw new Error('Documento sem frontmatter.');
  }

  let data: unknown;

  try {
    data = parse(match[1]);
  } catch (error) {
    throw new Error('Frontmatter com YAML inválido.', { cause: error });
  }

  return {
    meta: toMeta(data),
    body: raw.slice(match[0].length).replace(/^(\r?\n)+/, ''),
  };
}

function toMeta(data: unknown): DocumentMeta {
  if (!isObject(data)) {
    throw new Error('Frontmatter vazio.');
  }

  const id = requiredString(data, 'id');
  const title = requiredString(data, 'title');
  const type = requiredOneOf(data, 'type', types);
  const source = requiredOneOf(data, 'source', sources);
  const status = requiredOneOf(data, 'status', statuses);
  const category = stringList(data, 'category');
  const tags = stringList(data, 'tags');
  const createdAt = requiredDate(data, 'createdAt');
  const updatedAt = requiredDate(data, 'updatedAt');

  if (category.length > MAX_CATEGORY_DEPTH) {
    throw new Error(
      `Campo "category" excede ${MAX_CATEGORY_DEPTH} níveis no frontmatter.`,
    );
  }

  const sourceUrl = data.sourceUrl;

  if (sourceUrl !== undefined && typeof sourceUrl !== 'string') {
    throw new Error('Campo "sourceUrl" inválido no frontmatter.');
  }

  return {
    id,
    title,
    type: type as DocumentMeta['type'],
    source: source as DocumentMeta['source'],
    ...(sourceUrl ? { sourceUrl } : {}),
    status: status as DocumentMeta['status'],
    category,
    tags,
    createdAt,
    updatedAt,
  };
}

function requiredString(data: Record<string, unknown>, key: string): string {
  const value = data[key];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Campo "${key}" ausente ou inválido no frontmatter.`);
  }

  return value;
}

function requiredOneOf(
  data: Record<string, unknown>,
  key: string,
  allowed: string[],
): string {
  const value = requiredString(data, key);

  if (!allowed.includes(value)) {
    throw new Error(`Campo "${key}" com valor desconhecido: ${value}.`);
  }

  return value;
}

function requiredDate(data: Record<string, unknown>, key: string): string {
  const value = requiredString(data, key);

  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`Campo "${key}" não é uma data válida.`);
  }

  return value;
}

function stringList(data: Record<string, unknown>, key: string): string[] {
  const value = data[key];

  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Campo "${key}" deve ser uma lista de textos.`);
  }

  return value as string[];
}
