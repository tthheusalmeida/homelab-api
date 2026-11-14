import { Injectable } from '@nestjs/common';

import * as fs from 'node:fs';
import * as path from 'node:path';

import { AppConfig } from 'src/config/env/app-config';
import { EnvKeys } from 'src/config/env/env';

import { parseDocument, serializeDocument } from '../domain/frontmatter';
import {
  DocumentStatusOptions,
  MAX_CATEGORY_DEPTH,
  type DocumentMeta,
} from '../domain/library.types';
import {
  buildFileName,
  normalizeKey,
  parseFileName,
  sanitizeCategoryPath,
} from '../domain/naming';

export interface StoredDocument {
  /** Caminho completo do arquivo. */
  path: string;
  fileName: string;
  meta: DocumentMeta;
  body: string;
}

/**
 * Leitura e escrita dos arquivos Markdown. Os arquivos são a fonte da
 * verdade: documentos pendentes ficam em `TEMP_DOCS_DIR` (entrada) e os
 * publicados/arquivados em `LIB_DIR`, dentro das pastas da categoria.
 */
@Injectable()
export class LibraryStorage {
  readonly libDir: string;
  readonly inboxDir: string;

  constructor(config: AppConfig) {
    this.libDir = path.resolve(config.get(EnvKeys.LIB_DIR));
    this.inboxDir = path.resolve(config.get(EnvKeys.TEMP_DOCS_DIR));
  }

  /** Lista, recursivamente, os arquivos `.md` de uma pasta. */
  async listMarkdownFiles(root: string): Promise<string[]> {
    const result: string[] = [];

    const walk = async (dir: string): Promise<void> => {
      let entries: fs.Dirent[];

      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch (error) {
        if (isNotFound(error)) {
          return;
        }

        throw error;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
          result.push(fullPath);
        }
      }
    };

    await walk(root);

    return result.sort();
  }

  /**
   * A pasta em `LIB_DIR` manda na categoria: quem move o arquivo de pasta muda
   * a categoria sem editar o frontmatter. Vale só para publicado/arquivado, com
   * 1 a 4 níveis de pasta válidos; fora disso mantém a categoria do arquivo.
   */
  private categoryFromLocation(filePath: string, meta: DocumentMeta): string[] {
    if (meta.status === DocumentStatusOptions.PENDING) {
      return meta.category;
    }

    const relative = path.relative(this.libDir, path.dirname(filePath));

    if (
      relative === '' ||
      relative.startsWith('..') ||
      path.isAbsolute(relative)
    ) {
      return meta.category;
    }

    const folders = relative.split(path.sep);

    if (folders.length > MAX_CATEGORY_DEPTH) {
      return meta.category;
    }

    try {
      return sanitizeCategoryPath(folders);
    } catch {
      return meta.category;
    }
  }

  /** Procura pelo id no nome do arquivo, sem ler o conteúdo. */
  async findById(root: string, id: string): Promise<string | null> {
    const files = await this.listMarkdownFiles(root);

    return (
      files.find((file) => parseFileName(path.basename(file))?.id === id) ??
      null
    );
  }

  /** Lê e valida um documento; o id do nome deve bater com o do frontmatter. */
  async read(filePath: string): Promise<StoredDocument> {
    const fileName = path.basename(filePath);

    try {
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const { meta, body } = parseDocument(raw);

      if (parseFileName(fileName)?.id !== meta.id) {
        throw new Error(
          `O id do frontmatter (${meta.id}) não bate com o nome do arquivo.`,
        );
      }

      return {
        path: filePath,
        fileName,
        meta: { ...meta, category: this.categoryFromLocation(filePath, meta) },
        body,
      };
    } catch (error) {
      throw new Error(
        `Falha ao ler "${fileName}": ${
          error instanceof Error ? error.message : 'erro desconhecido'
        }`,
        { cause: error },
      );
    }
  }

  /**
   * Grava o documento no lugar certo para o seu status e devolve o caminho.
   * Pendente vai para a entrada; publicado e arquivado vão para a pasta da
   * categoria (1 a 4 níveis), reaproveitando pastas já existentes.
   */
  async save(meta: DocumentMeta, body: string): Promise<string> {
    const dir =
      meta.status === DocumentStatusOptions.PENDING
        ? this.inboxDir
        : await this.resolveCategoryDir(meta.category, true);

    await fs.promises.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, buildFileName(meta.title, meta.id));
    const temporary = `${filePath}.tmp`;

    // Escreve em arquivo temporário e renomeia: nunca deixa .md pela metade.
    await fs.promises.writeFile(
      temporary,
      serializeDocument(meta, body),
      'utf8',
    );
    await fs.promises.rename(temporary, filePath);

    return filePath;
  }

  /** Apaga o arquivo e remove as pastas de categoria que ficarem vazias. */
  async remove(filePath: string): Promise<void> {
    const resolved = path.resolve(filePath);
    const root = this.rootOf(resolved);

    await fs.promises.unlink(resolved);

    if (root === this.libDir) {
      await this.pruneEmptyDirs(path.dirname(resolved));
    }
  }

  /**
   * Resolve a pasta de uma categoria dentro de `LIB_DIR`. Compara os nomes
   * ignorando maiúsculas e acentos para reaproveitar pastas existentes e
   * evitar categorias duplicadas.
   */
  async resolveCategoryDir(
    category: string[],
    create: boolean,
  ): Promise<string> {
    let current = this.libDir;

    for (const name of sanitizeCategoryPath(category)) {
      const existing = await this.findChildDir(current, name);

      current = path.join(current, existing ?? name);
    }

    this.assertWithin(this.libDir, current);

    if (create) {
      await fs.promises.mkdir(current, { recursive: true });
    }

    return current;
  }

  private async findChildDir(
    parent: string,
    name: string,
  ): Promise<string | null> {
    try {
      const entries = await fs.promises.readdir(parent, {
        withFileTypes: true,
      });
      const key = normalizeKey(name);

      return (
        entries.find(
          (entry) => entry.isDirectory() && normalizeKey(entry.name) === key,
        )?.name ?? null
      );
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }

      throw error;
    }
  }

  private async pruneEmptyDirs(start: string): Promise<void> {
    let current = start;

    while (current !== this.libDir && current.startsWith(this.libDir)) {
      const entries = await fs.promises.readdir(current);

      if (entries.length > 0) {
        return;
      }

      await fs.promises.rmdir(current);
      current = path.dirname(current);
    }
  }

  private rootOf(target: string): string {
    for (const root of [this.libDir, this.inboxDir]) {
      if (isWithin(root, target)) {
        return root;
      }
    }

    throw new Error('Caminho fora das pastas da biblioteca.');
  }

  private assertWithin(root: string, target: string): void {
    if (!isWithin(root, target)) {
      throw new Error('Caminho fora das pastas da biblioteca.');
    }
  }
}

function isWithin(root: string, target: string): boolean {
  const relative = path.relative(root, target);

  return (
    relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  );
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
