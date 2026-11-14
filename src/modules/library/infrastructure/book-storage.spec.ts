import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  createTmpLibrary,
  type TmpLibrary,
} from '../../../../test/helpers/tmp-library';
import { newBook } from '../domain/book';
import { BOOKS_FOLDER, BookStorage } from './book-storage';

describe('BookStorage', () => {
  let tmp: TmpLibrary;
  let storage: BookStorage;

  beforeEach(() => {
    tmp = createTmpLibrary();
    storage = new BookStorage(tmp.storage);
  });

  afterEach(() => tmp.cleanup());

  it('when nothing was saved, should list no books', async () => {
    expect(await storage.list()).toEqual([]);
  });

  it('when a book is saved, should be found by id and listed', async () => {
    const book = newBook({ title: 'Pós' });

    await storage.save(book);

    expect(await storage.find(book.id)).toEqual(book);
    expect(await storage.list()).toEqual([book]);
  });

  it('when saving, should write inside the books folder of the library', async () => {
    const book = newBook({ title: 'Pós' });

    await storage.save(book);

    expect(
      fs.existsSync(path.join(tmp.lib, BOOKS_FOLDER, `${book.id}.json`)),
    ).toBe(true);
    expect(
      fs
        .readdirSync(path.join(tmp.lib, BOOKS_FOLDER))
        .some((f) => f.endsWith('.tmp')),
    ).toBe(false);
  });

  it('when the id does not exist, should find null', async () => {
    expect(await storage.find('nao-existe')).toBeNull();
  });

  it('when the id tries to escape the folder, should find null', async () => {
    expect(await storage.find('../../etc/passwd')).toBeNull();
  });

  it('when saving a book with an unsafe id, should throw', async () => {
    const book = { ...newBook({ title: 'x' }), id: '../fora' };

    await expect(storage.save(book)).rejects.toThrow('inválido');
  });

  it('when a file is not a valid book, should skip it in the list', async () => {
    const good = newBook({ title: 'Bom' });
    await storage.save(good);
    fs.writeFileSync(path.join(storage.dir, 'ruim.json'), '{ nao eh json');
    fs.writeFileSync(path.join(storage.dir, 'outro.json'), '{"id":"x"}');

    expect(await storage.list()).toEqual([good]);
  });

  it('when a book is removed, should delete the file and report true', async () => {
    const book = newBook({ title: 'T' });
    await storage.save(book);

    expect(await storage.remove(book.id)).toBe(true);
    expect(await storage.find(book.id)).toBeNull();
  });

  it('when removing a book that does not exist, should report false', async () => {
    expect(await storage.remove('nao-existe')).toBe(false);
    expect(await storage.remove('../x')).toBe(false);
  });

  it('when the books folder exists, should not be treated as a library category', async () => {
    await storage.save(newBook({ title: 'T' }));

    expect(await tmp.storage.listMarkdownFiles(tmp.lib)).toEqual([]);
  });
});
