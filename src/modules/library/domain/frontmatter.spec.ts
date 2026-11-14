import { parseDocument, serializeDocument } from './frontmatter';
import type { DocumentMeta } from './library.types';

const meta: DocumentMeta = {
  id: '123456',
  title: 'Práticas da Primeira Maneira: "fluxo"',
  type: 'summary',
  source: 'video',
  sourceUrl: 'https://exemplo.com/v.mp4',
  status: 'published',
  category: ['Ciência da Computação', 'DevOps'],
  tags: ['devops', 'engenharia de software'],
  createdAt: '2026-11-14T10:00:00.000Z',
  updatedAt: '2026-11-14T11:00:00.000Z',
};

const raw = (fields: string) => `---\n${fields}\n---\n\ncorpo\n`;

const valid = `id: "1"
title: "T"
type: "article"
source: "manual"
status: "pending"
category: []
tags: []
createdAt: "2026-01-01T00:00:00.000Z"
updatedAt: "2026-01-01T00:00:00.000Z"`;

describe('serializeDocument', () => {
  it('when serializing, should start with the YAML frontmatter and then the body', () => {
    const text = serializeDocument(meta, '# Título\n\nTexto');

    expect(text.startsWith('---\n')).toBe(true);
    expect(text).toContain('\n---\n\n# Título\n\nTexto\n');
  });

  it('when serializing, should write plain keys and quoted values like the documented example', () => {
    const text = serializeDocument(meta, 'x');

    expect(text).toContain('\nid: "123456"\n');
    expect(text).toContain('\ncategory:\n  - "Ciência da Computação"');
  });

  it('when the id looks like a number, should keep it as a string', () => {
    const parsed = parseDocument(serializeDocument(meta, 'x'));

    expect(parsed.meta.id).toBe('123456');
  });

  it('when there is no sourceUrl, should not write the field', () => {
    const { sourceUrl: _omit, ...rest } = meta;
    void _omit;

    expect(serializeDocument(rest, 'x')).not.toContain('sourceUrl');
  });

  it('when serializing, should trim the body and end with a single newline', () => {
    expect(serializeDocument(meta, '\n\n texto \n\n').endsWith('texto\n')).toBe(
      true,
    );
  });
});

describe('parseDocument', () => {
  it('when parsing a serialized document, should return the same meta and body', () => {
    const parsed = parseDocument(serializeDocument(meta, '# Olá\n\n- item'));

    expect(parsed.meta).toEqual(meta);
    expect(parsed.body).toBe('# Olá\n\n- item\n');
  });

  it('when the body has its own --- rules, should keep them in the body', () => {
    const parsed = parseDocument(serializeDocument(meta, 'a\n\n---\n\nb'));

    expect(parsed.body).toBe('a\n\n---\n\nb\n');
  });

  it('when the file uses CRLF line endings, should still parse it', () => {
    const parsed = parseDocument(raw(valid).replace(/\n/g, '\r\n'));

    expect(parsed.meta.id).toBe('1');
    expect(parsed.body).toBe('corpo\r\n');
  });

  it('when category and tags are missing, should default to empty lists', () => {
    const fields = valid
      .replace('category: []\n', '')
      .replace('tags: []\n', '');

    const parsed = parseDocument(raw(fields));

    expect(parsed.meta.category).toEqual([]);
    expect(parsed.meta.tags).toEqual([]);
  });

  it('when there is no frontmatter, should throw', () => {
    expect(() => parseDocument('# só markdown')).toThrow('sem frontmatter');
  });

  it('when the YAML is malformed, should throw', () => {
    expect(() => parseDocument(raw('id: [quebrado'))).toThrow('YAML inválido');
  });

  it('when the frontmatter is empty, should throw', () => {
    expect(() => parseDocument('---\n\n---\n\ncorpo')).toThrow();
  });

  it.each([
    'id',
    'title',
    'type',
    'source',
    'status',
    'createdAt',
    'updatedAt',
  ])(
    'when the required field %s is missing, should throw naming it',
    (field) => {
      const fields = valid
        .split('\n')
        .filter((line) => !line.startsWith(`${field}:`))
        .join('\n');

      expect(() => parseDocument(raw(fields))).toThrow(`"${field}"`);
    },
  );

  it('when type, source or status has an unknown value, should throw', () => {
    expect(() =>
      parseDocument(raw(valid.replace('"article"', '"poema"'))),
    ).toThrow('desconhecido');
    expect(() =>
      parseDocument(raw(valid.replace('"manual"', '"radio"'))),
    ).toThrow('desconhecido');
    expect(() =>
      parseDocument(raw(valid.replace('"pending"', '"lost"'))),
    ).toThrow('desconhecido');
  });

  it('when a date is invalid, should throw', () => {
    expect(() =>
      parseDocument(
        raw(valid.replace('"2026-01-01T00:00:00.000Z"', '"ontem"')),
      ),
    ).toThrow('data válida');
  });

  it('when category has more than 4 levels, should throw', () => {
    expect(() =>
      parseDocument(
        raw(valid.replace('category: []', 'category: [a,b,c,d,e]')),
      ),
    ).toThrow('excede');
  });

  it('when tags is not a list of strings, should throw', () => {
    expect(() =>
      parseDocument(raw(valid.replace('tags: []', 'tags: [1, 2]'))),
    ).toThrow('lista de textos');
  });

  it('when sourceUrl is not text, should throw', () => {
    expect(() => parseDocument(raw(`${valid}\nsourceUrl: 5`))).toThrow(
      'sourceUrl',
    );
  });
});
