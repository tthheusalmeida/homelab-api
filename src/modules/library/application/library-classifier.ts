import { BadGatewayException, Injectable } from '@nestjs/common';

import { AIService } from 'src/modules/ai/ai.service';
import { buildClassificationPrompt } from 'src/modules/ai/prompts/library-classification.prompt';
import { cheapestModel } from 'src/modules/ai/providers/gemini/gemini.pricing';

import type { CategoryNode } from '../domain/categories';
import { MAX_CATEGORY_DEPTH } from '../domain/library.types';
import { normalizeKey, sanitizeCategoryPath } from '../domain/naming';

import { LibraryService } from './library.service';

const MAX_CONTENT_CHARS = 6000;
const MAX_TITLE_CHARS = 120;
const MAX_TAGS = 6;
const MAX_KNOWN_TAGS = 60;

export interface ClassificationSuggestion {
  title: string;
  category: string[];
  tags: string[];
  /** Modelo usado na sugestão. */
  model: string;
}

@Injectable()
export class LibraryClassifier {
  constructor(
    private readonly library: LibraryService,
    private readonly ai: AIService,
  ) {}

  /** Pede ao Gemini uma sugestão de título, categoria e tags para o documento. */
  async suggest(
    id: string,
    modelId?: string,
  ): Promise<ClassificationSuggestion> {
    const { meta, content } = await this.library.get(id);

    const tree = this.library.categories();
    const knownTags = this.library
      .tags()
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_KNOWN_TAGS)
      .map((entry) => entry.tag);

    const model = modelId?.trim() || cheapestModel();

    const prompt = buildClassificationPrompt({
      title: meta.title,
      content: content.slice(0, MAX_CONTENT_CHARS),
      categories: flattenCategories(tree),
      tags: knownTags,
    });

    let answer: string;

    try {
      answer = await this.ai.chat({
        message: prompt,
        modelId: model,
        providerId: 'gemini',
      });
    } catch (error) {
      throw new BadGatewayException(
        'Não foi possível obter a sugestão da IA. Tente novamente.',
        { cause: error },
      );
    }

    const raw = parseJsonObject(answer);

    return {
      title: cleanTitle(raw.title) || meta.title,
      category: cleanCategory(raw.category, tree),
      tags: cleanTags(raw.tags, knownTags),
      model,
    };
  }
}

function invalidAnswer(): BadGatewayException {
  return new BadGatewayException(
    'A IA não retornou uma sugestão válida. Tente novamente.',
  );
}

/** Extrai o objeto JSON da resposta, mesmo se vier dentro de cercas de código. */
function parseJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end <= start) {
    throw invalidAnswer();
  }

  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw invalidAnswer();
    }

    return parsed as Record<string, unknown>;
  } catch {
    throw invalidAnswer();
  }
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

function cleanTitle(value: unknown): string {
  return typeof value === 'string'
    ? value.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_CHARS)
    : '';
}

/** Caminhos existentes (`A > B`), para o prompt preferir categorias já criadas. */
function flattenCategories(nodes: CategoryNode[]): string[] {
  return nodes.flatMap((node) => [
    node.path.join(' > '),
    ...flattenCategories(node.children),
  ]);
}

/**
 * Valida a categoria sugerida e, em cada nível, reaproveita a grafia de uma
 * pasta existente (ignorando acento e maiúscula) em vez de criar uma duplicata.
 */
function cleanCategory(value: unknown, tree: CategoryNode[]): string[] {
  const path = asStringList(value).slice(0, MAX_CATEGORY_DEPTH);

  if (path.length === 0) {
    throw invalidAnswer();
  }

  let sanitized: string[];

  try {
    sanitized = sanitizeCategoryPath(path);
  } catch {
    throw invalidAnswer();
  }

  let level = tree;

  return sanitized.map((name) => {
    const existing = level.find(
      (node) => normalizeKey(node.name) === normalizeKey(name),
    );

    level = existing?.children ?? [];

    return existing?.name ?? name;
  });
}

function cleanTags(value: unknown, knownTags: string[]): string[] {
  const result: string[] = [];

  for (const item of asStringList(value)) {
    const key = normalizeKey(item);
    const tag =
      knownTags.find((known) => normalizeKey(known) === key) ??
      item.replace(/\s+/g, ' ').toLowerCase();

    if (tag && !result.includes(tag)) {
      result.push(tag);
    }
  }

  return result.slice(0, MAX_TAGS);
}
