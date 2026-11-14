import { Injectable, Logger } from '@nestjs/common';

import * as fs from 'node:fs';
import * as path from 'node:path';

import { parseBook, type Book } from '../domain/book';
import { LibraryStorage } from './library-storage';

/** Pasta dos livros dentro de `LIB_DIR` (um `.json` por livro). */
export const BOOKS_FOLDER = '_livros';

const SAFE_ID = /^[A-Za-z0-9-]+$/;

/**
 * Um arquivo JSON por livro em `LIB_DIR/_livros`. Guarda só a ordem e os
 * módulos; o texto fica nos documentos. A pasta não tem `.md`, então a
 * biblioteca a ignora.
 */
@Injectable()
export class BookStorage {
  private readonly logger = new Logger(BookStorage.name);
  readonly dir: string;

  constructor(storage: LibraryStorage) {
    this.dir = path.join(storage.libDir, BOOKS_FOLDER);
  }

  private fileOf(id: string): string {
    if (!SAFE_ID.test(id)) {
      throw new Error('Id de livro inválido.');
    }

    return path.join(this.dir, `${id}.json`);
  }

  /** Todos os livros legíveis; arquivo inválido é ignorado e registrado. */
  async list(): Promise<Book[]> {
    let names: string[];

    try {
      names = await fs.promises.readdir(this.dir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }

      throw error;
    }

    const books: Book[] = [];

    for (const name of names.filter((file) => file.endsWith('.json'))) {
      try {
        const raw = await fs.promises.readFile(
          path.join(this.dir, name),
          'utf8',
        );

        books.push(parseBook(JSON.parse(raw)));
      } catch (error) {
        this.logger.warn(`Livro ignorado (${name}): ${String(error)}`);
      }
    }

    return books;
  }

  async find(id: string): Promise<Book | null> {
    if (!SAFE_ID.test(id)) {
      return null;
    }

    try {
      const raw = await fs.promises.readFile(this.fileOf(id), 'utf8');

      return parseBook(JSON.parse(raw));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }

      throw error;
    }
  }

  /** Gravação atômica: escreve em `.tmp` e renomeia. */
  async save(book: Book): Promise<void> {
    const file = this.fileOf(book.id);
    const tmp = `${file}.tmp`;

    await fs.promises.mkdir(this.dir, { recursive: true });
    await fs.promises.writeFile(tmp, JSON.stringify(book, null, 2), 'utf8');
    await fs.promises.rename(tmp, file);
  }

  /** Remove o livro (não toca nos documentos); `false` se não existia. */
  async remove(id: string): Promise<boolean> {
    if (!SAFE_ID.test(id)) {
      return false;
    }

    try {
      await fs.promises.unlink(this.fileOf(id));

      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }

      throw error;
    }
  }
}
