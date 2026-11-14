import { BadRequestException } from '@nestjs/common';

import type { BookService } from './application/book.service';
import { BookController } from './book.controller';

describe('BookController', () => {
  let service: Record<
    | 'list'
    | 'create'
    | 'get'
    | 'update'
    | 'remove'
    | 'setStructure'
    | 'addChapter'
    | 'read'
    | 'search',
    jest.Mock
  >;
  let controller: BookController;

  beforeEach(() => {
    service = {
      list: jest.fn().mockResolvedValue(['list']),
      create: jest.fn().mockResolvedValue('created'),
      get: jest.fn().mockResolvedValue('book'),
      update: jest.fn().mockResolvedValue('updated'),
      remove: jest.fn().mockResolvedValue(undefined),
      setStructure: jest.fn().mockResolvedValue('structure'),
      addChapter: jest.fn().mockResolvedValue('chapter'),
      read: jest.fn().mockResolvedValue('reading'),
      search: jest.fn().mockResolvedValue(['hit']),
    };
    controller = new BookController(service as unknown as BookService);
  });

  it('when listing, should pass the optional document id', async () => {
    await controller.list('d1');
    await controller.list();

    expect(service.list).toHaveBeenNthCalledWith(1, 'd1');
    expect(service.list).toHaveBeenNthCalledWith(2, undefined);
  });

  it('when creating, should pass the body', async () => {
    const dto = { title: 'T', kind: 'pos' as const };

    await expect(controller.create(dto)).resolves.toBe('created');
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('when getting, updating and reading, should delegate with the id', async () => {
    await controller.get('b1');
    await controller.update('b1', { title: 'N' });
    await controller.read('b1');

    expect(service.get).toHaveBeenCalledWith('b1');
    expect(service.update).toHaveBeenCalledWith('b1', { title: 'N' });
    expect(service.read).toHaveBeenCalledWith('b1');
  });

  it('when removing, should delegate and return nothing', async () => {
    await expect(controller.remove('b1')).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('b1');
  });

  it('when setting the structure, should pass the modules', async () => {
    const modules = [{ title: 'M', documentIds: ['a'] }];

    await controller.setStructure('b1', { modules });

    expect(service.setStructure).toHaveBeenCalledWith('b1', modules);
  });

  it('when the structure has no module list, should be a bad request', () => {
    expect(() => controller.setStructure('b1', {} as { modules: [] })).toThrow(
      BadRequestException,
    );
    expect(service.setStructure).not.toHaveBeenCalled();
  });

  it('when adding a chapter, should pass document and module', async () => {
    await controller.addChapter('b1', { documentId: 'd1', moduleId: 'm1' });

    expect(service.addChapter).toHaveBeenCalledWith('b1', 'd1', 'm1');
  });

  it('when searching, should pass the query and default it to empty', async () => {
    await controller.search('b1', 'docker');
    await controller.search('b1');

    expect(service.search).toHaveBeenNthCalledWith(1, 'b1', 'docker');
    expect(service.search).toHaveBeenNthCalledWith(2, 'b1', '');
  });
});
