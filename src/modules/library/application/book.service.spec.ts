import { BadRequestException, NotFoundException } from '@nestjs/common';

import {
  createTmpLibrary,
  type TmpLibrary,
} from '../../../../test/helpers/tmp-library';
import { BookStorage } from '../infrastructure/book-storage';
import { LibraryIndex } from '../infrastructure/library-index';
import { BookService } from './book.service';
import { LibrarySearch } from './library-search';
import { LibraryService } from './library.service';

describe('BookService', () => {
  let tmp: TmpLibrary;
  let library: LibraryService;
  let books: BookService;

  beforeEach(() => {
    tmp = createTmpLibrary();
    const index = new LibraryIndex(tmp.storage);
    library = new LibraryService(
      tmp.storage,
      index,
      new LibrarySearch(index, tmp.storage),
    );
    books = new BookService(new BookStorage(tmp.storage), index, library);
  });

  afterEach(() => tmp.cleanup());

  const article = async (title: string, content = `# ${title}\n\nTexto`) =>
    (
      await library.createArticle({
        title,
        category: ['DevOps'],
        content,
      })
    ).meta.id;

  describe('create / list / get', () => {
    it('when a book is created, should be listed with zero chapters', async () => {
      const created = await books.create({
        title: 'Pós em DevOps',
        kind: 'pos',
      });

      const list = await books.list();

      expect(list).toEqual([
        expect.objectContaining({
          id: created.id,
          title: 'Pós em DevOps',
          kind: 'pos',
          chapterCount: 0,
          moduleCount: 1,
        }),
      ]);
    });

    it('when the title is blank, should be a bad request', async () => {
      await expect(books.create({ title: '  ' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('when the kind is invalid, should be a bad request', async () => {
      await expect(
        books.create({ title: 'T', kind: 'revista' }),
      ).rejects.toThrow('Tipo de livro inválido');
    });

    it('when listing, should order books by title naturally', async () => {
      await books.create({ title: 'Livro 10' });
      await books.create({ title: 'Livro 2' });

      expect((await books.list()).map((b) => b.title)).toEqual([
        'Livro 2',
        'Livro 10',
      ]);
    });

    it('when listing for a document, should flag the books that contain it', async () => {
      const id = await article('Aula 1');
      const a = await books.create({ title: 'A' });
      await books.create({ title: 'B' });
      await books.addChapter(a.id, id);

      const list = await books.list(id);

      expect(list.map((b) => [b.title, b.containsDocument])).toEqual([
        ['A', true],
        ['B', false],
      ]);
    });

    it('when the book does not exist, should be not found', async () => {
      await expect(books.get('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cover', () => {
    it('when created with cover data, should store and list it', async () => {
      const created = await books.create({
        title: 'Pós',
        subtitle: 'Aulas',
        coverColor: 'violet',
        coverImageUrl: 'https://exemplo.com/capa.jpg',
      });

      expect(created).toMatchObject({
        subtitle: 'Aulas',
        coverColor: 'violet',
        coverImageUrl: 'https://exemplo.com/capa.jpg',
      });
      expect((await books.list())[0]).toMatchObject({
        subtitle: 'Aulas',
        coverColor: 'violet',
        coverImageUrl: 'https://exemplo.com/capa.jpg',
      });
    });

    it('when created without cover data, should get the default color', async () => {
      const created = await books.create({ title: 'Pós' });

      expect(created).toMatchObject({
        subtitle: '',
        coverColor: 'blue',
        coverImageUrl: '',
      });
    });

    it('when the color is invalid, should be a bad request', async () => {
      await expect(
        books.create({ title: 'T', coverColor: 'pink' }),
      ).rejects.toThrow('Cor de capa inválida');
    });

    it('when the image url is not http(s), should be a bad request', async () => {
      await expect(
        books.create({ title: 'T', coverImageUrl: 'ftp://a/b.png' }),
      ).rejects.toThrow('URL http(s) válida');
    });

    it('when updating only the cover, should keep title and other fields', async () => {
      const book = await books.create({ title: 'T', description: 'd' });

      const updated = await books.update(book.id, {
        coverColor: 'amber',
        subtitle: 'Sub',
      });

      expect(updated).toMatchObject({
        title: 'T',
        description: 'd',
        coverColor: 'amber',
        subtitle: 'Sub',
      });
    });

    it('when the image url is sent empty, should remove the image', async () => {
      const book = await books.create({
        title: 'T',
        coverImageUrl: 'https://a.com/x.png',
      });

      const updated = await books.update(book.id, { coverImageUrl: '' });

      expect(updated.coverImageUrl).toBe('');
    });

    it('when the update does not mention the cover, should keep it', async () => {
      const book = await books.create({
        title: 'T',
        coverColor: 'rose',
        coverImageUrl: 'https://a.com/x.png',
      });

      const updated = await books.update(book.id, { title: 'Novo' });

      expect(updated).toMatchObject({
        coverColor: 'rose',
        coverImageUrl: 'https://a.com/x.png',
      });
    });

    it('when the update has an invalid color, should be a bad request and keep the old one', async () => {
      const book = await books.create({ title: 'T', coverColor: 'rose' });

      await expect(books.update(book.id, { coverColor: 'x' })).rejects.toThrow(
        BadRequestException,
      );
      expect((await books.get(book.id)).coverColor).toBe('rose');
    });
  });

  describe('update / remove', () => {
    it('when updating, should change only the given fields', async () => {
      const book = await books.create({ title: 'T', description: 'd' });

      const updated = await books.update(book.id, { title: 'Novo' });

      expect(updated.title).toBe('Novo');
      expect(updated.description).toBe('d');
      expect(updated.kind).toBe('study');
    });

    it('when updating the kind to an invalid one, should be a bad request', async () => {
      const book = await books.create({ title: 'T' });

      await expect(books.update(book.id, { kind: 'x' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('when removing, should delete the book and keep the documents', async () => {
      const id = await article('Aula');
      const book = await books.create({ title: 'T' });
      await books.addChapter(book.id, id);

      await books.remove(book.id);

      await expect(books.get(book.id)).rejects.toThrow(NotFoundException);
      expect((await library.get(id)).meta.title).toBe('Aula');
    });

    it('when removing a book that does not exist, should be not found', async () => {
      await expect(books.remove('nao-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addChapter', () => {
    it('when adding a published document, should append it to the last module', async () => {
      const a = await article('Aula 1');
      const b = await article('Aula 2');
      const book = await books.create({ title: 'T' });

      await books.addChapter(book.id, a);
      const detail = await books.addChapter(book.id, b);

      expect(detail.modules[0].chapters.map((c) => c.title)).toEqual([
        'Aula 1',
        'Aula 2',
      ]);
    });

    it('when a module is given, should append to it', async () => {
      const a = await article('Aula 1');
      const book = await books.create({ title: 'T' });
      const withModules = await books.setStructure(book.id, [
        { title: 'M1', documentIds: [] },
        { title: 'M2', documentIds: [] },
      ]);

      const detail = await books.addChapter(
        book.id,
        a,
        withModules.modules[0].id,
      );

      expect(detail.modules[0].chapters).toHaveLength(1);
      expect(detail.modules[1].chapters).toHaveLength(0);
    });

    it('when the document is already in the book, should be a bad request', async () => {
      const a = await article('Aula');
      const book = await books.create({ title: 'T' });
      await books.addChapter(book.id, a);

      await expect(books.addChapter(book.id, a)).rejects.toThrow(
        'já está neste livro',
      );
    });

    it('when the document is not published, should be a bad request', async () => {
      const book = await books.create({ title: 'T' });

      await expect(books.addChapter(book.id, 'nao-existe')).rejects.toThrow(
        'não está na biblioteca',
      );
    });

    it('when the module does not belong to the book, should be a bad request', async () => {
      const a = await article('Aula');
      const book = await books.create({ title: 'T' });

      await expect(books.addChapter(book.id, a, 'outro')).rejects.toThrow(
        'Módulo não encontrado',
      );
    });
  });

  describe('setStructure', () => {
    it('when reordering, should keep the new order and module titles', async () => {
      const a = await article('A');
      const b = await article('B');
      const book = await books.create({ title: 'T' });

      const detail = await books.setStructure(book.id, [
        { title: ' Módulo 1 ', documentIds: [b, a] },
      ]);

      expect(detail.modules[0].title).toBe('Módulo 1');
      expect(detail.modules[0].chapters.map((c) => c.title)).toEqual([
        'B',
        'A',
      ]);
    });

    it('when a document is not in the library, should be a bad request', async () => {
      const book = await books.create({ title: 'T' });

      await expect(
        books.setStructure(book.id, [{ documentIds: ['fantasma'] }]),
      ).rejects.toThrow('não está na biblioteca');
    });

    it('when the same document is repeated, should be a bad request', async () => {
      const a = await article('A');
      const book = await books.create({ title: 'T' });

      await expect(
        books.setStructure(book.id, [{ documentIds: [a, a] }]),
      ).rejects.toThrow('uma vez');
    });

    it('when a chapter became unavailable, should still allow saving it or removing it', async () => {
      const a = await article('A');
      const book = await books.create({ title: 'T' });
      await books.addChapter(book.id, a);
      await library.archive(a);

      const kept = await books.setStructure(book.id, [{ documentIds: [a] }]);
      expect(kept.modules[0].chapters[0].available).toBe(false);

      const removed = await books.setStructure(book.id, [{ documentIds: [] }]);
      expect(removed.modules[0].chapters).toEqual([]);
    });

    it('when saving, should persist across a new service instance', async () => {
      const a = await article('A');
      const book = await books.create({ title: 'T' });
      await books.setStructure(book.id, [{ title: 'M', documentIds: [a] }]);

      const again = new BookService(
        new BookStorage(tmp.storage),
        new LibraryIndex(tmp.storage),
        library,
      );

      expect((await again.get(book.id)).modules[0].title).toBe('M');
    });
  });

  describe('detail', () => {
    it('when a chapter is archived, should mark it unavailable with a placeholder title', async () => {
      const a = await article('A');
      const book = await books.create({ title: 'T' });
      await books.addChapter(book.id, a);
      await library.archive(a);

      const chapter = (await books.get(book.id)).modules[0].chapters[0];

      expect(chapter).toMatchObject({
        documentId: a,
        available: false,
        title: 'Página indisponível',
      });
    });
  });

  describe('read', () => {
    it('when reading, should return the chapters in order with their content', async () => {
      const a = await article('A', '# A\n\ntexto a');
      const b = await article('B', '# B\n\ntexto b');
      const book = await books.create({ title: 'T' });
      await books.setStructure(book.id, [
        { title: 'M1', documentIds: [b] },
        { title: 'M2', documentIds: [a] },
      ]);

      const reading = await books.read(book.id);

      expect(reading.book.title).toBe('T');
      expect(reading.modules.map((m) => m.title)).toEqual(['M1', 'M2']);
      expect(reading.modules[0].chapters[0]).toMatchObject({
        title: 'B',
        content: expect.stringContaining('texto b'),
      });
    });

    it('when a chapter is unavailable, should skip it', async () => {
      const a = await article('A');
      const b = await article('B');
      const book = await books.create({ title: 'T' });
      await books.setStructure(book.id, [{ documentIds: [a, b] }]);
      await library.archive(a);

      const reading = await books.read(book.id);

      expect(reading.modules[0].chapters.map((c) => c.title)).toEqual(['B']);
    });
  });

  describe('search', () => {
    const setup = async () => {
      const a = await article(
        'Docker',
        '# Docker\n\n## Imagens\n\nUma imagem é construída com Dockerfile.\n\n## Redes\n\nContêineres conversam por redes.',
      );
      const b = await article(
        'Kubernetes',
        '# Kubernetes\n\nO cluster agenda contêineres em nós.',
      );
      const book = await books.create({ title: 'T' });
      await books.setStructure(book.id, [
        { title: 'Módulo 1', documentIds: [a] },
        { title: 'Módulo 2', documentIds: [b] },
      ]);

      return { a, b, book };
    };

    it('when a line has the words, should return chapter, module, line and snippet', async () => {
      const { a, book } = await setup();

      const hits = await books.search(book.id, 'dockerfile');

      expect(hits).toEqual([
        expect.objectContaining({
          documentId: a,
          chapterTitle: 'Docker',
          moduleTitle: 'Módulo 1',
          line: 5,
          snippet: expect.stringContaining('Dockerfile'),
        }),
      ]);
    });

    it('when searching, should ignore accents and case', async () => {
      const { book } = await setup();

      const hits = await books.search(book.id, 'CONTEINERES');

      expect(hits.map((h) => h.chapterTitle)).toEqual(['Docker', 'Kubernetes']);
    });

    it('when several words are given, should require all of them in the same line', async () => {
      const { book } = await setup();

      expect(await books.search(book.id, 'cluster nós')).toHaveLength(1);
      expect(await books.search(book.id, 'cluster dockerfile')).toEqual([]);
    });

    it('when the query is blank, should return nothing', async () => {
      const { book } = await setup();

      expect(await books.search(book.id, '   ')).toEqual([]);
    });

    it('when a heading matches, should return it without the # marker', async () => {
      const { book } = await setup();

      const hits = await books.search(book.id, 'redes');

      expect(hits[0].snippet.startsWith('#')).toBe(false);
      expect(hits[0].line).toBe(7);
    });

    it('when a chapter has many matches, should limit them per chapter', async () => {
      const a = await article(
        'Repetido',
        Array.from({ length: 10 }, () => 'linha com palavra').join('\n'),
      );
      const book = await books.create({ title: 'T' });
      await books.addChapter(book.id, a);

      expect(await books.search(book.id, 'palavra')).toHaveLength(3);
    });

    it('when a line is long, should cut a snippet around the match with ellipsis', async () => {
      const long = `${'a '.repeat(200)}alvo ${'b '.repeat(200)}`;
      const a = await article('Longo', long);
      const book = await books.create({ title: 'T' });
      await books.addChapter(book.id, a);

      const [hit] = await books.search(book.id, 'alvo');

      expect(hit.snippet.startsWith('…')).toBe(true);
      expect(hit.snippet.endsWith('…')).toBe(true);
      expect(hit.snippet).toContain('alvo');
      expect(hit.snippet.length).toBeLessThan(200);
    });
  });
});
