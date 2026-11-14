import { BadRequestException } from '@nestjs/common';

import {
  createTmpLibrary,
  type TmpLibrary,
} from '../../../../test/helpers/tmp-library';
import { newPendingMeta } from '../domain/document';
import type { DocumentMeta } from '../domain/library.types';
import { LibraryIndex } from '../infrastructure/library-index';
import { LibrarySearch } from './library-search';

describe('LibrarySearch', () => {
  let tmp: TmpLibrary;
  let index: LibraryIndex;
  let search: LibrarySearch;

  const add = async (
    id: string,
    title: string,
    body: string,
    overrides: Partial<DocumentMeta> = {},
  ) => {
    const meta: DocumentMeta = {
      ...newPendingMeta({ id, title, type: 'summary' }),
      status: 'published',
      category: ['Ciência', 'DevOps'],
      ...overrides,
    };

    index.upsert(await tmp.storage.read(await tmp.storage.save(meta, body)));
  };

  const titles = async (filters: Parameters<LibrarySearch['search']>[0]) =>
    (await search.search(filters)).map((doc) => doc.title);

  beforeEach(() => {
    tmp = createTmpLibrary();
    index = new LibraryIndex(tmp.storage);
    search = new LibrarySearch(index, tmp.storage);
  });

  afterEach(() => tmp.cleanup());

  describe('filters', () => {
    it('when no status is given, should return only published documents', async () => {
      await add('1', 'Publicado', 'x');
      await add('2', 'Arquivado', 'x', { status: 'archived' });
      await add('3', 'Pendente', 'x', { status: 'pending', category: [] });

      expect(await titles({})).toEqual(['Publicado']);
    });

    it('when status is archived or pending, should return those documents', async () => {
      await add('2', 'Arquivado', 'x', { status: 'archived' });
      await add('3', 'Pendente', 'x', { status: 'pending', category: [] });

      expect(await titles({ status: 'archived' })).toEqual(['Arquivado']);
      expect(await titles({ status: 'pending' })).toEqual(['Pendente']);
    });

    it('when filtering by type, should return only that type', async () => {
      await add('1', 'Resumo', 'x', { type: 'summary' });
      await add('2', 'Transcrição', 'x', { type: 'transcription' });

      expect(await titles({ type: 'transcription' })).toEqual(['Transcrição']);
    });

    it('when filtering by source, should return only that source', async () => {
      await add('1', 'De vídeo', 'x', { source: 'video' });
      await add('2', 'Manual', 'x', { source: 'manual' });

      expect(await titles({ source: 'manual' })).toEqual(['Manual']);
    });

    it('when filtering by category, should include documents in the subtree', async () => {
      await add('1', 'Prática', 'x', {
        category: ['Ciência', 'DevOps', 'Práticas'],
      });
      await add('2', 'Redes', 'x', { category: ['Ciência', 'Redes'] });
      await add('3', 'Química', 'x', { category: ['Química'] });

      expect(await titles({ category: ['Ciência'] })).toEqual([
        'Prática',
        'Redes',
      ]);
      expect(await titles({ category: ['ciencia', 'devops'] })).toEqual([
        'Prática',
      ]);
      expect(
        await titles({ category: ['Ciência', 'DevOps', 'Práticas'] }),
      ).toEqual(['Prática']);
    });

    it('when filtering by several tags, should require all of them', async () => {
      await add('1', 'A', 'x', { tags: ['devops', 'ci'] });
      await add('2', 'B', 'x', { tags: ['devops'] });

      expect(await titles({ tags: ['devops'] })).toEqual(['A', 'B']);
      expect(await titles({ tags: ['DevOps', 'CI'] })).toEqual(['A']);
    });

    it('when combining filters, should apply all of them', async () => {
      await add('1', 'Transcrição DevOps', 'x', { type: 'transcription' });
      await add('2', 'Resumo DevOps', 'x', { type: 'summary' });
      await add('3', 'Transcrição Química', 'x', {
        type: 'transcription',
        category: ['Química'],
      });

      expect(
        await titles({
          category: ['Ciência', 'DevOps'],
          type: 'transcription',
        }),
      ).toEqual(['Transcrição DevOps']);
    });

    it.each([
      { type: 'poema' },
      { source: 'radio' },
      { status: 'lost' },
      { sort: 'random' },
    ])('when the filter %j is invalid, should throw', async (filters) => {
      await expect(search.search(filters)).rejects.toThrow(BadRequestException);
    });
  });

  describe('text search', () => {
    it('when the text is in the title, should match by metadata', async () => {
      await add('1', 'Práticas da Primeira Maneira', 'x');

      const [result] = await search.search({ q: 'primeira' });

      expect(result.title).toBe('Práticas da Primeira Maneira');
      expect(result.matchedIn).toBe('metadata');
    });

    it('when the text matches a tag, a category or the file name, should match by metadata', async () => {
      await add('1', 'Doc A', 'x', { tags: ['kubernetes'] });
      await add('2', 'Doc B', 'x', { category: ['Química', 'Ligações'] });

      expect(await titles({ q: 'kubernetes' })).toEqual(['Doc A']);
      expect(await titles({ q: 'ligacoes', category: [] })).toEqual(['Doc B']);
      expect(await titles({ q: 'doc_a' })).toEqual(['Doc A']);
    });

    it('when the text is only in the file content, should match by content', async () => {
      await add(
        '1',
        'Sem relação',
        'O pipeline automatiza a entrega contínua.',
      );

      const [result] = await search.search({ q: 'entrega continua' });

      expect(result.title).toBe('Sem relação');
      expect(result.matchedIn).toBe('content');
    });

    it('when searching, should ignore case and accents', async () => {
      await add('1', 'Doc', 'Integração CONTÍNUA');

      expect(await titles({ q: 'integracao continua' })).toEqual(['Doc']);
    });

    it('when the words are split between metadata and content, should still match', async () => {
      await add('1', 'Docker', 'Containers isolam processos.');

      expect(await titles({ q: 'docker containers' })).toEqual(['Docker']);
    });

    it('when a word is nowhere, should not match', async () => {
      await add('1', 'Docker', 'Containers isolam processos.');

      expect(await titles({ q: 'docker banana' })).toEqual([]);
    });

    it('when the text matches only archived documents, should not return them by default', async () => {
      await add('1', 'Docker', 'x', { status: 'archived' });

      expect(await titles({ q: 'docker' })).toEqual([]);
    });

    it('when a document file cannot be read, should skip it without failing', async () => {
      await add('1', 'Quebrado', 'texto');
      index.get('1')!.path = '/nao/existe_1.md';

      expect(await titles({ q: 'texto' })).toEqual([]);
    });

    it('when there are many documents to read, should still find all content matches', async () => {
      for (let i = 0; i < 20; i++) {
        await add(
          `id${i}`,
          `Doc ${String(i).padStart(2, '0')}`,
          'palavra-rara aqui',
        );
      }

      expect(await search.search({ q: 'palavra-rara' })).toHaveLength(20);
    });
  });

  describe('sorting', () => {
    it('when sorting by title (default), should use natural alphanumeric order', async () => {
      await add('1', 'Aula 10', 'x');
      await add('2', 'Aula 2', 'x');
      await add('3', 'Árvore', 'x');
      await add('4', 'Banana', 'x');

      expect(await titles({})).toEqual([
        'Árvore',
        'Aula 2',
        'Aula 10',
        'Banana',
      ]);
    });

    it('when sorting by recent, should put the newest first', async () => {
      await add('1', 'Velho', 'x', { createdAt: '2026-01-01T00:00:00.000Z' });
      await add('2', 'Novo', 'x', { createdAt: '2026-06-01T00:00:00.000Z' });

      expect(await titles({ sort: 'recent' })).toEqual(['Novo', 'Velho']);
    });
  });

  describe('result shape', () => {
    it('when returning results, should include metadata, file name and preview but no body', async () => {
      await add('1', 'Doc', '# Título\n\nTexto longo aqui', { tags: ['a'] });

      const [result] = await search.search({});

      expect(result).toMatchObject({
        id: '1',
        title: 'Doc',
        type: 'summary',
        status: 'published',
        tags: ['a'],
        category: ['Ciência', 'DevOps'],
        fileName: 'doc_1.md',
        preview: 'Título Texto longo aqui',
      });
      expect(result).not.toHaveProperty('body');
      expect(result).not.toHaveProperty('content');
    });
  });
});
