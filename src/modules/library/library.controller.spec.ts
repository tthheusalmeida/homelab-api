import { BadRequestException } from '@nestjs/common';

import type { LibraryClassifier } from './application/library-classifier';
import type { LibraryService } from './application/library.service';
import { LibraryController } from './library.controller';

describe('LibraryController', () => {
  let service: Record<
    | 'list'
    | 'inbox'
    | 'categories'
    | 'tags'
    | 'indexStatus'
    | 'reindex'
    | 'createArticle'
    | 'get'
    | 'publish'
    | 'archive'
    | 'discard',
    jest.Mock
  >;
  let classifier: { suggest: jest.Mock };
  let controller: LibraryController;

  beforeEach(() => {
    service = {
      list: jest.fn().mockResolvedValue([]),
      inbox: jest.fn().mockReturnValue(['inbox']),
      categories: jest.fn().mockReturnValue(['tree']),
      tags: jest.fn().mockReturnValue(['tags']),
      indexStatus: jest.fn().mockReturnValue({ total: 0, errors: [] }),
      reindex: jest.fn().mockResolvedValue({ indexed: 0, errors: [] }),
      createArticle: jest.fn().mockResolvedValue('article'),
      get: jest.fn().mockResolvedValue('doc'),
      publish: jest.fn().mockResolvedValue('published'),
      archive: jest.fn().mockResolvedValue('archived'),
      discard: jest.fn().mockResolvedValue(undefined),
    };
    classifier = { suggest: jest.fn().mockResolvedValue('suggestion') };
    controller = new LibraryController(
      service as unknown as LibraryService,
      classifier as unknown as LibraryClassifier,
    );
  });

  describe('suggest', () => {
    it('when a model is given, should pass the id and the model to the classifier', async () => {
      await expect(
        controller.suggest('x', { modelId: 'gemini-3.1-flash-lite' }),
      ).resolves.toBe('suggestion');
      expect(classifier.suggest).toHaveBeenCalledWith(
        'x',
        'gemini-3.1-flash-lite',
      );
    });

    it('when the body is empty, should call the classifier without a model', async () => {
      await controller.suggest('x', {});

      expect(classifier.suggest).toHaveBeenCalledWith('x', undefined);
    });
  });

  describe('list', () => {
    it('when query params are repeated, should turn category and tag into lists', async () => {
      await controller.list({
        q: 'devops',
        category: ['Ciência', 'DevOps'],
        tag: ['a', 'b'],
        type: 'summary',
        source: 'video',
        status: 'published',
        sort: 'recent',
      });

      expect(service.list).toHaveBeenCalledWith({
        q: 'devops',
        category: ['Ciência', 'DevOps'],
        type: 'summary',
        source: 'video',
        tags: ['a', 'b'],
        status: 'published',
        sort: 'recent',
      });
    });

    it('when a single value is given, should wrap it in a list', async () => {
      await controller.list({ category: 'Ciência', tag: 'a' });

      expect(service.list).toHaveBeenCalledWith(
        expect.objectContaining({ category: ['Ciência'], tags: ['a'] }),
      );
    });

    it('when no filters are given, should send empty lists', async () => {
      await controller.list({});

      expect(service.list).toHaveBeenCalledWith(
        expect.objectContaining({ category: [], tags: [] }),
      );
    });
  });

  it('when reading inbox, categories, tags, index status and reindex, should delegate to the service', async () => {
    expect(controller.inbox()).toEqual(['inbox']);
    expect(controller.categories()).toEqual(['tree']);
    expect(controller.tags()).toEqual(['tags']);
    expect(controller.indexStatus()).toEqual({ total: 0, errors: [] });
    await expect(controller.reindex()).resolves.toEqual({
      indexed: 0,
      errors: [],
    });
  });

  it('when getting a document, should delegate with the id', async () => {
    await expect(controller.get('x')).resolves.toBe('doc');
    expect(service.get).toHaveBeenCalledWith('x');
  });

  describe('createArticle', () => {
    it('when the body is valid, should delegate to the service', async () => {
      await controller.createArticle({
        title: 'T',
        category: ['A'],
        tags: ['t'],
        content: 'c',
      });

      expect(service.createArticle).toHaveBeenCalledWith({
        title: 'T',
        category: ['A'],
        tags: ['t'],
        content: 'c',
      });
    });

    it('when category is not a list of texts, should throw BadRequestException', () => {
      expect(() =>
        controller.createArticle({
          title: 'T',
          category: 'A' as unknown as string[],
          content: 'c',
        }),
      ).toThrow(BadRequestException);
    });

    it('when tags contain a non text value, should throw BadRequestException', () => {
      expect(() =>
        controller.createArticle({
          title: 'T',
          category: ['A'],
          tags: [1] as unknown as string[],
          content: 'c',
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('publish / archive / discard', () => {
    it('when publishing, should pass id, title, category and tags', async () => {
      await controller.publish('x', {
        title: 'T',
        category: ['A', 'B'],
        tags: ['t'],
      });

      expect(service.publish).toHaveBeenCalledWith('x', {
        title: 'T',
        category: ['A', 'B'],
        tags: ['t'],
      });
    });

    it('when publishing without a category list, should throw BadRequestException', () => {
      expect(() =>
        controller.publish('x', {} as unknown as { category: string[] }),
      ).toThrow(BadRequestException);
      expect(service.publish).not.toHaveBeenCalled();
    });

    it('when archiving, should delegate with the id', async () => {
      await expect(controller.archive('x')).resolves.toBe('archived');
    });

    it('when discarding, should delegate and return nothing', async () => {
      await expect(controller.discard('x')).resolves.toBeUndefined();
      expect(service.discard).toHaveBeenCalledWith('x');
    });
  });
});
