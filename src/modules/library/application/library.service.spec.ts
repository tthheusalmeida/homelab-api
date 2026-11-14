import * as fs from 'node:fs';
import * as path from 'node:path';

import { BadRequestException, NotFoundException } from '@nestjs/common';

import {
  createTmpLibrary,
  type TmpLibrary,
} from '../../../../test/helpers/tmp-library';
import { newPendingMeta } from '../domain/document';
import type { DocumentMeta } from '../domain/library.types';
import { LibraryIndex } from '../infrastructure/library-index';
import { LibrarySearch } from './library-search';
import { LibraryService } from './library.service';

describe('LibraryService', () => {
  let tmp: TmpLibrary;
  let index: LibraryIndex;
  let service: LibraryService;

  const build = () => {
    index = new LibraryIndex(tmp.storage);
    service = new LibraryService(
      tmp.storage,
      index,
      new LibrarySearch(index, tmp.storage),
    );
  };

  /** Documento gerado por um job: pendente, na pasta de entrada. */
  const seedPending = async (
    id = 'job1',
    overrides: Partial<DocumentMeta> = {},
  ) => {
    const meta: DocumentMeta = {
      ...newPendingMeta({
        id,
        title: 'Resumo de vídeo',
        type: 'summary',
        sourceUrl: 'https://x/v.mp4',
      }),
      ...overrides,
    };
    const file = await tmp.storage.save(meta, '# Resumo\n\nTexto do resumo');

    index.upsert(await tmp.storage.read(file));

    return file;
  };

  const publishInput = {
    title: 'Práticas da Primeira Maneira',
    category: ['Ciência da Computação', 'DevOps'],
    tags: ['DevOps', ' engenharia '],
  };

  beforeEach(() => {
    tmp = createTmpLibrary();
    build();
  });

  afterEach(() => tmp.cleanup());

  describe('onModuleInit / reindex', () => {
    it('when the app starts, should rebuild the index from the files', async () => {
      await seedPending();
      build();

      await service.onModuleInit();

      expect(service.inbox()).toHaveLength(1);
    });

    it('when the rebuild fails, should not crash the app', async () => {
      jest.spyOn(index, 'rebuild').mockRejectedValue(new Error('disco'));

      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });

    it('when a file is added outside the app and reindex runs, should include it', async () => {
      await service.reindex();
      expect(service.indexStatus().total).toBe(0);

      await seedPending();
      build();
      const result = await service.reindex();

      expect(result.indexed).toBe(1);
      expect(service.indexStatus()).toEqual({ total: 1, errors: [] });
    });

    it('when a file is invalid, should expose it in the index status', async () => {
      fs.mkdirSync(tmp.inbox, { recursive: true });
      fs.writeFileSync(path.join(tmp.inbox, 'ruim_id1.md'), 'sem frontmatter');

      await service.reindex();

      expect(service.indexStatus().errors).toHaveLength(1);
    });
  });

  describe('inbox', () => {
    it('when there are pending documents, should list them newest first', async () => {
      await seedPending('a', { createdAt: '2026-01-01T00:00:00.000Z' });
      await seedPending('b', { createdAt: '2026-06-01T00:00:00.000Z' });

      expect(service.inbox().map((doc) => doc.id)).toEqual(['b', 'a']);
    });

    it('when a document is published, should leave the inbox', async () => {
      await seedPending();

      await service.publish('job1', publishInput);

      expect(service.inbox()).toEqual([]);
    });
  });

  describe('publish', () => {
    it('when publishing a pending document, should move it to its category folder and delete it from the inbox', async () => {
      const pending = await seedPending();

      await service.publish('job1', publishInput);

      const published = path.join(
        tmp.lib,
        'Ciência da Computação',
        'DevOps',
        'praticas_da_primeira_maneira_job1.md',
      );
      expect(fs.existsSync(published)).toBe(true);
      expect(fs.existsSync(pending)).toBe(false);
    });

    it('when publishing, should write title, category, normalized tags, status and a newer updatedAt', async () => {
      await seedPending();
      const before = index.get('job1')!.meta.updatedAt;

      const { meta } = await service.publish('job1', publishInput);

      expect(meta).toMatchObject({
        id: 'job1',
        title: 'Práticas da Primeira Maneira',
        category: ['Ciência da Computação', 'DevOps'],
        tags: ['devops', 'engenharia'],
        status: 'published',
        type: 'summary',
        sourceUrl: 'https://x/v.mp4',
      });
      expect(meta.updatedAt >= before).toBe(true);
      expect(meta.createdAt).toBe(index.get('job1')!.meta.createdAt);
    });

    it('when publishing, should keep the body and make the document searchable', async () => {
      await seedPending();

      await service.publish('job1', publishInput);

      const detail = await service.get('job1');
      expect(detail.content).toContain('Texto do resumo');
      expect(await service.list({ q: 'primeira maneira' })).toHaveLength(1);
    });

    it('when no title is given, should keep the current one', async () => {
      await seedPending();

      const { meta } = await service.publish('job1', {
        category: ['Geral'],
      });

      expect(meta.title).toBe('Resumo de vídeo');
    });

    it('when no tags are given, should keep the current ones', async () => {
      await seedPending('job1', { tags: ['antiga'] });

      const { meta } = await service.publish('job1', { category: ['Geral'] });

      expect(meta.tags).toEqual(['antiga']);
    });

    it('when the category already exists with another case or accent, should reuse its folder', async () => {
      await seedPending('a');
      await seedPending('b');
      await service.publish('a', { category: ['Ciência', 'DevOps'] });

      await service.publish('b', { category: ['ciencia', 'devops'] });

      expect(fs.readdirSync(tmp.lib)).toEqual(['Ciência']);
    });

    it('when the category is invalid, should throw and keep the file in the inbox', async () => {
      const pending = await seedPending();

      await expect(
        service.publish('job1', { category: ['1', '2', '3', '4', '5'] }),
      ).rejects.toThrow(BadRequestException);
      await expect(service.publish('job1', { category: [] })).rejects.toThrow(
        BadRequestException,
      );

      expect(fs.existsSync(pending)).toBe(true);
      expect(index.get('job1')?.meta.status).toBe('pending');
    });

    it('when the title is blank, should throw', async () => {
      await seedPending();

      await expect(
        service.publish('job1', { title: '  ', category: ['A'] }),
      ).rejects.toThrow('título');
    });

    it('when the document is already published, should throw', async () => {
      await seedPending();
      await service.publish('job1', publishInput);

      await expect(service.publish('job1', publishInput)).rejects.toThrow(
        'já está na biblioteca',
      );
    });

    it('when the id does not exist, should throw NotFoundException', async () => {
      await expect(service.publish('nope', publishInput)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('when re-adding an archived document with another category, should move it and drop the old folder', async () => {
      await seedPending();
      await service.publish('job1', { category: ['Antiga'] });
      await service.archive('job1');

      await service.publish('job1', { category: ['Nova'] });

      expect(fs.readdirSync(tmp.lib)).toEqual(['Nova']);
      expect(index.get('job1')?.meta.status).toBe('published');
      expect(await service.list({ category: ['Nova'] })).toHaveLength(1);
    });
  });

  describe('update', () => {
    const publishedId = async () => {
      await seedPending();
      await service.publish('job1', publishInput);

      return 'job1';
    };

    it('when only the content changes, should rewrite the body and keep title, category and tags', async () => {
      const id = await publishedId();

      const result = await service.update(id, { content: '# Novo\n\ntexto' });

      expect(result.content).toBe('# Novo\n\ntexto');
      expect(result.meta).toMatchObject({
        title: 'Práticas da Primeira Maneira',
        category: ['Ciência da Computação', 'DevOps'],
        tags: ['devops', 'engenharia'],
        status: 'published',
      });
      expect((await service.get(id)).content).toBe('# Novo\n\ntexto\n');
    });

    it('when the category changes, should move the file and remove the old one and empty folders', async () => {
      const id = await publishedId();
      const oldPath = index.get(id)!.path;

      await service.update(id, { category: ['Estudos', 'Docker'] });

      const newPath = index.get(id)!.path;

      expect(newPath).toBe(
        path.join(tmp.lib, 'Estudos', 'Docker', path.basename(oldPath)),
      );
      expect(fs.existsSync(newPath)).toBe(true);
      expect(fs.existsSync(oldPath)).toBe(false);
      expect(fs.existsSync(path.join(tmp.lib, 'Ciência da Computação'))).toBe(
        false,
      );
      expect(index.get(id)!.meta.category).toEqual(['Estudos', 'Docker']);
    });

    it('when the title changes, should rename the file and keep a single copy', async () => {
      const id = await publishedId();
      const oldPath = index.get(id)!.path;

      await service.update(id, { title: '  Outro Título ' });

      const newPath = index.get(id)!.path;

      expect(path.basename(newPath)).toBe('outro_titulo_job1.md');
      expect(fs.existsSync(oldPath)).toBe(false);
      expect((await service.get(id)).meta.title).toBe('Outro Título');
    });

    it('when tags are given, should normalize them; when omitted, should keep the current ones', async () => {
      const id = await publishedId();

      await service.update(id, { tags: ['  Nova ', 'nova', 'Outra'] });
      expect(index.get(id)!.meta.tags).toEqual(['nova', 'outra']);

      await service.update(id, { content: 'x' });
      expect(index.get(id)!.meta.tags).toEqual(['nova', 'outra']);
    });

    it('when updating, should refresh updatedAt and keep createdAt', async () => {
      const id = await publishedId();
      const before = index.get(id)!.meta;

      await new Promise((resolve) => setTimeout(resolve, 5));
      const { meta } = await service.update(id, { content: 'x' });

      expect(meta.createdAt).toBe(before.createdAt);
      expect(meta.updatedAt > before.updatedAt).toBe(true);
    });

    it('when the document is not published, should throw BadRequestException and change nothing', async () => {
      const file = await seedPending();

      await expect(
        service.update('job1', { title: 'X' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fs.existsSync(file)).toBe(true);
    });

    it('when the document is archived, should throw BadRequestException', async () => {
      const id = await publishedId();
      await service.archive(id);

      await expect(service.update(id, { title: 'X' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('when the id does not exist, should throw NotFoundException', async () => {
      await expect(
        service.update('nope', { title: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('when the content is blank, should throw BadRequestException and keep the old content', async () => {
      const id = await publishedId();

      await expect(
        service.update(id, { content: '   ' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect((await service.get(id)).content).toContain('Texto do resumo');
    });

    it('when the title is blank, should throw BadRequestException', async () => {
      const id = await publishedId();

      await expect(service.update(id, { title: '  ' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('when the category is invalid, should throw and leave the file where it was', async () => {
      const id = await publishedId();
      const oldPath = index.get(id)!.path;

      await expect(
        service.update(id, { category: ['a', 'b', 'c', 'd', 'e'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.update(id, { category: [] })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(fs.existsSync(oldPath)).toBe(true);
      expect(index.get(id)!.path).toBe(oldPath);
    });
  });

  describe('archive (logical removal)', () => {
    it('when archiving a published document, should keep the file in the lib but hide it from the library', async () => {
      await seedPending();
      await service.publish('job1', publishInput);

      const { meta } = await service.archive('job1');

      expect(meta.status).toBe('archived');
      expect(await service.list({})).toEqual([]);
      expect(await service.list({ status: 'archived' })).toHaveLength(1);
      expect(await tmp.storage.listMarkdownFiles(tmp.lib)).toHaveLength(1);
      expect(
        (await tmp.storage.read(index.get('job1')!.path)).meta.status,
      ).toBe('archived');
    });

    it('when archiving, should remove the document from categories and tags', async () => {
      await seedPending();
      await service.publish('job1', publishInput);

      await service.archive('job1');

      expect(service.categories()).toEqual([]);
      expect(service.tags()).toEqual([]);
    });

    it('when the document is not published, should throw', async () => {
      await seedPending();

      await expect(service.archive('job1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('when the id does not exist, should throw NotFoundException', async () => {
      await expect(service.archive('nope')).rejects.toThrow(NotFoundException);
    });

    it('when the app restarts, should still keep the archived document hidden', async () => {
      await seedPending();
      await service.publish('job1', publishInput);
      await service.archive('job1');

      build();
      await service.reindex();

      expect(await service.list({})).toEqual([]);
      expect(await service.list({ status: 'archived' })).toHaveLength(1);
    });
  });

  describe('discard', () => {
    it('when discarding a pending document, should delete the file and the index entry', async () => {
      const file = await seedPending();

      await service.discard('job1');

      expect(fs.existsSync(file)).toBe(false);
      expect(service.inbox()).toEqual([]);
    });

    it('when discarding an archived document, should delete the file and prune empty folders', async () => {
      await seedPending();
      await service.publish('job1', publishInput);
      await service.archive('job1');

      await service.discard('job1');

      expect(await tmp.storage.listMarkdownFiles(tmp.lib)).toEqual([]);
      expect(fs.readdirSync(tmp.lib)).toEqual([]);
    });

    it('when the document is published, should refuse and keep it', async () => {
      await seedPending();
      await service.publish('job1', publishInput);

      await expect(service.discard('job1')).rejects.toThrow(
        'antes de descartá-lo',
      );
      expect(index.get('job1')).toBeDefined();
    });

    it('when the id does not exist, should throw NotFoundException', async () => {
      await expect(service.discard('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createArticle', () => {
    const article = {
      title: 'Ligações Peptídicas',
      category: ['Química', 'Ligações'],
      tags: ['Bioquímica'],
      content: '# Ligações\n\nConteúdo',
    };

    it('when creating, should save a published manual article in its folder', async () => {
      const { meta, content } = await service.createArticle(article);

      expect(meta).toMatchObject({
        title: 'Ligações Peptídicas',
        type: 'article',
        source: 'manual',
        status: 'published',
        category: ['Química', 'Ligações'],
        tags: ['bioquímica'],
      });
      expect(meta.id).toEqual(expect.any(String));
      expect(content).toBe('# Ligações\n\nConteúdo');

      const file = path.join(
        tmp.lib,
        'Química',
        'Ligações',
        `ligacoes_peptidicas_${meta.id}.md`,
      );
      expect(fs.existsSync(file)).toBe(true);
    });

    it('when creating, should make the article available in the library, categories and tags', async () => {
      await service.createArticle(article);

      expect(await service.list({ type: 'article' })).toHaveLength(1);
      expect(service.categories()[0]).toMatchObject({
        name: 'Química',
        count: 1,
      });
      expect(service.tags()).toEqual([{ tag: 'bioquímica', count: 1 }]);
    });

    it('when the title is blank, should throw', async () => {
      await expect(
        service.createArticle({ ...article, title: ' ' }),
      ).rejects.toThrow('título');
    });

    it('when the content is blank, should throw', async () => {
      await expect(
        service.createArticle({ ...article, content: '  ' }),
      ).rejects.toThrow('conteúdo');
    });

    it('when the category is invalid, should throw and write nothing', async () => {
      await expect(
        service.createArticle({ ...article, category: [] }),
      ).rejects.toThrow(BadRequestException);

      expect(fs.existsSync(tmp.lib)).toBe(false);
    });

    it('when two articles have the same title, should create two distinct files', async () => {
      await service.createArticle(article);
      await service.createArticle(article);

      expect(await tmp.storage.listMarkdownFiles(tmp.lib)).toHaveLength(2);
    });
  });

  describe('get', () => {
    it('when the document exists, should return its meta and body', async () => {
      await seedPending();

      const detail = await service.get('job1');

      expect(detail.meta.id).toBe('job1');
      expect(detail.content).toBe('# Resumo\n\nTexto do resumo\n');
    });

    it('when the id does not exist, should throw NotFoundException', async () => {
      await expect(service.get('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('categories / tags', () => {
    it('when documents are published, should build the tree and count tags, alphabetically', async () => {
      await service.createArticle({
        title: 'A',
        category: ['Química', 'Ligações'],
        tags: ['z', 'a'],
        content: 'x',
      });
      await service.createArticle({
        title: 'B',
        category: ['Ciência'],
        tags: ['a'],
        content: 'x',
      });

      expect(service.categories().map((n) => [n.name, n.count])).toEqual([
        ['Ciência', 1],
        ['Química', 1],
      ]);
      expect(service.tags()).toEqual([
        { tag: 'a', count: 2 },
        { tag: 'z', count: 1 },
      ]);
    });

    it('when only pending documents exist, should return empty categories and tags', async () => {
      await seedPending('job1', { tags: ['x'], category: ['Algo'] });

      expect(service.categories()).toEqual([]);
      expect(service.tags()).toEqual([]);
    });
  });
});
