import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  createTmpLibrary,
  type TmpLibrary,
} from '../../../../test/helpers/tmp-library';
import { newPendingMeta } from '../domain/document';
import type { DocumentMeta } from '../domain/library.types';
import { LibraryIndex } from './library-index';

describe('LibraryIndex', () => {
  let tmp: TmpLibrary;
  let index: LibraryIndex;

  const meta = (overrides: Partial<DocumentMeta> = {}): DocumentMeta => ({
    ...newPendingMeta({ id: 'id1', title: 'Segunda Maneira', type: 'summary' }),
    ...overrides,
  });

  const published = (overrides: Partial<DocumentMeta> = {}) =>
    meta({
      status: 'published',
      category: ['Ciência', 'DevOps'],
      ...overrides,
    });

  beforeEach(() => {
    tmp = createTmpLibrary();
    index = new LibraryIndex(tmp.storage);
  });

  afterEach(() => tmp.cleanup());

  describe('rebuild', () => {
    it('when both folders are empty, should index nothing', async () => {
      await expect(index.rebuild()).resolves.toEqual({
        indexed: 0,
        errors: [],
      });
      expect(index.size).toBe(0);
    });

    it('when there are files in the inbox and in the lib, should index both', async () => {
      await tmp.storage.save(meta({ id: 'a' }), 'x');
      await tmp.storage.save(published({ id: 'b' }), 'y');

      const result = await index.rebuild();

      expect(result.indexed).toBe(2);
      expect(index.get('a')?.meta.status).toBe('pending');
      expect(index.get('b')?.meta.status).toBe('published');
    });

    it('when indexing, should store path, file name and a plain text preview but not the body', async () => {
      const file = await tmp.storage.save(
        published(),
        '# Título\n\nTexto **forte**',
      );

      await index.rebuild();

      const doc = index.get('id1')!;
      expect(doc.path).toBe(file);
      expect(doc.fileName).toBe('segunda_maneira_id1.md');
      expect(doc.preview).toBe('Título Texto forte');
      expect(JSON.stringify(doc)).not.toContain('**forte**');
    });

    it('when indexing, should build a normalized search key from title, file name, tags and category', async () => {
      await tmp.storage.save(
        published({ tags: ['Engenharia'], category: ['Ciência', 'DevOps'] }),
        'x',
      );

      await index.rebuild();

      const key = index.get('id1')!.searchKey;
      expect(key).toContain('segunda maneira');
      expect(key).toContain('engenharia');
      expect(key).toContain('ciencia');
      expect(key).toContain('devops');
    });

    it('when a file is invalid, should skip it and report it without failing', async () => {
      await tmp.storage.save(published(), 'x');
      fs.mkdirSync(tmp.inbox, { recursive: true });
      fs.writeFileSync(
        path.join(tmp.inbox, 'quebrado_id9.md'),
        '# sem frontmatter',
      );

      const result = await index.rebuild();

      expect(result.indexed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].file).toBe('quebrado_id9.md');
      expect(index.errors).toEqual(result.errors);
    });

    it('when the same id exists in two files, should keep the newest and report the other', async () => {
      await tmp.storage.save(
        meta({
          id: 'dup',
          title: 'Antigo',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
        'a',
      );
      await tmp.storage.save(
        published({
          id: 'dup',
          title: 'Novo',
          updatedAt: '2026-06-01T00:00:00.000Z',
        }),
        'b',
      );

      const result = await index.rebuild();

      expect(result.indexed).toBe(1);
      expect(index.get('dup')?.meta.title).toBe('Novo');
      expect(result.errors[0].message).toContain('Id duplicado');
    });

    it('when rebuilding again, should replace the previous state', async () => {
      const file = await tmp.storage.save(published(), 'x');
      await index.rebuild();

      fs.unlinkSync(file);
      await index.rebuild();

      expect(index.size).toBe(0);
    });

    it('when the folder holds non markdown files, should ignore them', async () => {
      fs.mkdirSync(tmp.inbox, { recursive: true });
      fs.writeFileSync(path.join(tmp.inbox, 'nota.txt'), 'x');

      await expect(index.rebuild()).resolves.toEqual({
        indexed: 0,
        errors: [],
      });
    });
  });

  describe('upsert / remove / all', () => {
    it('when upserting a stored document, should make it available by id', async () => {
      const file = await tmp.storage.save(published(), 'texto');

      index.upsert(await tmp.storage.read(file));

      expect(index.get('id1')?.meta.title).toBe('Segunda Maneira');
      expect(index.all()).toHaveLength(1);
    });

    it('when upserting the same id, should replace the entry', async () => {
      const file = await tmp.storage.save(published(), 'a');
      index.upsert(await tmp.storage.read(file));
      const file2 = await tmp.storage.save(published({ title: 'Outro' }), 'b');
      index.upsert(await tmp.storage.read(file2));

      expect(index.size).toBe(1);
      expect(index.get('id1')?.meta.title).toBe('Outro');
    });

    it('when removing an id, should drop it from the index only', async () => {
      const file = await tmp.storage.save(published(), 'x');
      index.upsert(await tmp.storage.read(file));

      index.remove('id1');

      expect(index.get('id1')).toBeUndefined();
      expect(fs.existsSync(file)).toBe(true);
    });
  });
});
