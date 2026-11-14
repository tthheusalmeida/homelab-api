import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { BadRequestException } from '@nestjs/common';

import type { AppConfig } from 'src/config/env/app-config';

import { newPendingMeta } from '../domain/document';
import { serializeDocument } from '../domain/frontmatter';
import type { DocumentMeta } from '../domain/library.types';
import { LibraryStorage } from './library-storage';

describe('LibraryStorage', () => {
  let root: string;
  let lib: string;
  let inbox: string;
  let storage: LibraryStorage;

  const meta = (overrides: Partial<DocumentMeta> = {}): DocumentMeta => ({
    ...newPendingMeta({ id: 'id1', title: 'Segunda Maneira', type: 'summary' }),
    ...overrides,
  });

  const published = (overrides: Partial<DocumentMeta> = {}) =>
    meta({
      status: 'published',
      category: ['Ciência da Computação', 'DevOps'],
      ...overrides,
    });

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'library-spec-'));
    lib = path.join(root, 'lib');
    inbox = path.join(root, 'docs');

    storage = new LibraryStorage({
      get: (key: string) => ({ LIB_DIR: lib, TEMP_DOCS_DIR: inbox })[key],
    } as unknown as AppConfig);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('save', () => {
    it('when the document is pending, should write it in the inbox as <slug>_<id>.md', async () => {
      const file = await storage.save(meta(), 'corpo');

      expect(file).toBe(path.join(inbox, 'segunda_maneira_id1.md'));
      expect(fs.existsSync(file)).toBe(true);
    });

    it('when the document is published, should write it inside its category folders in the lib', async () => {
      const file = await storage.save(published(), 'corpo');

      expect(file).toBe(
        path.join(
          lib,
          'Ciência da Computação',
          'DevOps',
          'segunda_maneira_id1.md',
        ),
      );
    });

    it('when saving, should write the frontmatter and the body', async () => {
      const file = await storage.save(published(), '# Título\n\ntexto');

      const raw = fs.readFileSync(file, 'utf8');
      expect(raw).toContain('id: "id1"');
      expect(raw).toContain('status: "published"');
      expect(raw.endsWith('# Título\n\ntexto\n')).toBe(true);
    });

    it('when saving, should not leave temporary files behind', async () => {
      await storage.save(published(), 'x');

      const files = await storage.listMarkdownFiles(lib);
      expect(files).toHaveLength(1);
      expect(fs.readdirSync(path.dirname(files[0]))).toEqual([
        path.basename(files[0]),
      ]);
    });

    it('when the document already exists, should overwrite it', async () => {
      await storage.save(published(), 'antigo');
      const file = await storage.save(published(), 'novo');

      expect(fs.readFileSync(file, 'utf8')).toContain('novo');
      expect(await storage.listMarkdownFiles(lib)).toHaveLength(1);
    });

    it('when a published document has no category, should throw', async () => {
      await expect(
        storage.save(published({ category: [] }), 'x'),
      ).rejects.toThrow(BadRequestException);
    });

    it('when a published document has more than four levels, should throw', async () => {
      await expect(
        storage.save(published({ category: ['1', '2', '3', '4', '5'] }), 'x'),
      ).rejects.toThrow(BadRequestException);
    });

    it('when the category tries to escape the lib, should not write outside it', async () => {
      const file = await storage
        .save(published({ category: ['..', '..', 'fora'] }), 'x')
        .catch(() => null);

      expect(file === null || file.startsWith(lib)).toBe(true);
      expect(fs.existsSync(path.join(root, 'fora'))).toBe(false);
    });

    it('when the category differs only by case or accent, should reuse the existing folder', async () => {
      await storage.save(published(), 'a');
      const second = await storage.save(
        published({
          id: 'id2',
          category: ['ciencia da computacao', 'DEVOPS'],
        }),
        'b',
      );

      expect(path.dirname(second)).toBe(
        path.join(lib, 'Ciência da Computação', 'DevOps'),
      );
      expect(fs.readdirSync(lib)).toEqual(['Ciência da Computação']);
    });

    it('when the category is new, should create the folder with the given name', async () => {
      const file = await storage.save(
        published({ category: ['Química', 'Ligações'] }),
        'x',
      );

      expect(path.dirname(file)).toBe(path.join(lib, 'Química', 'Ligações'));
    });
  });

  describe('read', () => {
    it('when the file is valid, should return meta, body, path and file name', async () => {
      const file = await storage.save(published(), 'texto');

      const doc = await storage.read(file);

      expect(doc.meta).toMatchObject({ id: 'id1', status: 'published' });
      expect(doc.body).toBe('texto\n');
      expect(doc.path).toBe(file);
      expect(doc.fileName).toBe('segunda_maneira_id1.md');
    });

    it('when the file has no frontmatter, should throw naming the file', async () => {
      fs.mkdirSync(inbox, { recursive: true });
      const file = path.join(inbox, 'solto_id9.md');
      fs.writeFileSync(file, '# só markdown');

      await expect(storage.read(file)).rejects.toThrow(
        /solto_id9\.md.*frontmatter/,
      );
    });

    it('when the frontmatter id differs from the file name id, should throw', async () => {
      fs.mkdirSync(inbox, { recursive: true });
      const file = path.join(inbox, 'x_outro.md');
      fs.writeFileSync(file, serializeDocument(meta(), 'x'));

      await expect(storage.read(file)).rejects.toThrow('não bate');
    });

    it('when the file does not exist, should throw naming the file', async () => {
      await expect(storage.read(path.join(inbox, 'a_b.md'))).rejects.toThrow(
        'a_b.md',
      );
    });
  });

  describe('listMarkdownFiles / findById', () => {
    it('when the folder does not exist, should return an empty list', async () => {
      await expect(storage.listMarkdownFiles(lib)).resolves.toEqual([]);
    });

    it('when listing, should include nested .md files and ignore other files', async () => {
      await storage.save(published(), 'x');
      await storage.save(meta({ id: 'id2' }), 'y');
      fs.writeFileSync(path.join(inbox, 'nota.txt'), 'z');
      fs.writeFileSync(path.join(inbox, 'parcial.md.tmp'), 'z');

      expect(await storage.listMarkdownFiles(lib)).toHaveLength(1);
      expect(await storage.listMarkdownFiles(inbox)).toEqual([
        path.join(inbox, 'segunda_maneira_id2.md'),
      ]);
    });

    it('when the id is in a file name, should find it without reading the content', async () => {
      const file = await storage.save(published(), 'x');

      await expect(storage.findById(lib, 'id1')).resolves.toBe(file);
    });

    it('when the id does not exist, should return null', async () => {
      await storage.save(published(), 'x');

      await expect(storage.findById(lib, 'nao-existe')).resolves.toBeNull();
    });

    it('when one id is a suffix of another, should not confuse them', async () => {
      await storage.save(published({ id: 'abc' }), 'x');
      await storage.save(published({ id: 'xabc' }), 'y');

      const found = await storage.findById(lib, 'abc');

      expect(path.basename(found!)).toBe('segunda_maneira_abc.md');
    });
  });

  describe('remove', () => {
    it('when removing a library document, should delete it and prune empty category folders', async () => {
      const file = await storage.save(published(), 'x');

      await storage.remove(file);

      expect(fs.existsSync(file)).toBe(false);
      expect(fs.existsSync(path.join(lib, 'Ciência da Computação'))).toBe(
        false,
      );
      expect(fs.existsSync(lib)).toBe(true);
    });

    it('when a sibling document remains, should keep the category folder', async () => {
      const a = await storage.save(published(), 'x');
      await storage.save(published({ id: 'id2' }), 'y');

      await storage.remove(a);

      expect(
        fs.existsSync(path.join(lib, 'Ciência da Computação', 'DevOps')),
      ).toBe(true);
    });

    it('when only the deepest folder is empty, should keep the parent that still has content', async () => {
      const deep = await storage.save(published(), 'x');
      await storage.save(
        published({ id: 'id2', category: ['Ciência da Computação'] }),
        'y',
      );

      await storage.remove(deep);

      expect(fs.existsSync(path.join(lib, 'Ciência da Computação'))).toBe(true);
      expect(
        fs.existsSync(path.join(lib, 'Ciência da Computação', 'DevOps')),
      ).toBe(false);
    });

    it('when removing an inbox document, should delete only the file', async () => {
      const file = await storage.save(meta(), 'x');

      await storage.remove(file);

      expect(fs.existsSync(file)).toBe(false);
      expect(fs.existsSync(inbox)).toBe(true);
    });

    it('when the path is outside the lib and inbox, should refuse and keep the file', async () => {
      const outside = path.join(root, 'outro.md');
      fs.writeFileSync(outside, 'x');

      await expect(storage.remove(outside)).rejects.toThrow('fora das pastas');
      expect(fs.existsSync(outside)).toBe(true);
    });

    it('when the file does not exist, should throw', async () => {
      await expect(storage.remove(path.join(lib, 'a_b.md'))).rejects.toThrow();
    });
  });

  describe('resolveCategoryDir', () => {
    it('when create is false, should not create folders', async () => {
      const dir = await storage.resolveCategoryDir(['A', 'B'], false);

      expect(dir).toBe(path.join(lib, 'A', 'B'));
      expect(fs.existsSync(lib)).toBe(false);
    });

    it('when a level has invalid characters, should sanitize it', async () => {
      const dir = await storage.resolveCategoryDir(['DevOps: CI/CD'], false);

      expect(dir).toBe(path.join(lib, 'DevOps CI CD'));
    });

    it('when a level is a reserved name, should throw', async () => {
      await expect(storage.resolveCategoryDir(['CON'], false)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
