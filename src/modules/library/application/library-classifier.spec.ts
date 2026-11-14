import { BadGatewayException, NotFoundException } from '@nestjs/common';

import type { AIService } from 'src/modules/ai/ai.service';

import type { CategoryNode } from '../domain/categories';

import { LibraryClassifier } from './library-classifier';
import type { LibraryService } from './library.service';

const tree: CategoryNode[] = [
  {
    name: 'Química',
    path: ['Química'],
    count: 2,
    children: [
      {
        name: 'Ligações',
        path: ['Química', 'Ligações'],
        count: 2,
        children: [],
      },
    ],
  },
];

describe('LibraryClassifier', () => {
  let library: Record<'get' | 'categories' | 'tags', jest.Mock>;
  let ai: { chat: jest.Mock };
  let classifier: LibraryClassifier;

  function sentMessage(): string {
    const calls = ai.chat.mock.calls as Array<[{ message: string }]>;

    return calls[0][0].message;
  }

  function answer(value: unknown) {
    ai.chat.mockResolvedValue(
      typeof value === 'string' ? value : JSON.stringify(value),
    );
  }

  beforeEach(() => {
    library = {
      get: jest.fn().mockResolvedValue({
        meta: { title: 'Título atual' },
        content: 'Texto do documento',
      }),
      categories: jest.fn().mockReturnValue(tree),
      tags: jest.fn().mockReturnValue([
        { tag: 'docker', count: 1 },
        { tag: 'ligação', count: 5 },
      ]),
    };
    ai = { chat: jest.fn() };
    classifier = new LibraryClassifier(
      library as unknown as LibraryService,
      ai as unknown as AIService,
    );
  });

  it('when no model is given, should use gemini with the cheapest model', async () => {
    answer({ title: 'T', category: ['Química'], tags: ['a'] });

    const result = await classifier.suggest('id1');

    expect(ai.chat).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'gemini',
        modelId: 'gemini-3.1-flash-lite',
      }),
    );
    expect(result.model).toBe('gemini-3.1-flash-lite');
  });

  it('when a model is given, should use it', async () => {
    answer({ title: 'T', category: ['Química'], tags: [] });

    const result = await classifier.suggest('id1', 'gemini-3.5-flash');

    expect(ai.chat).toHaveBeenCalledWith(
      expect.objectContaining({ modelId: 'gemini-3.5-flash' }),
    );
    expect(result.model).toBe('gemini-3.5-flash');
  });

  it('when building the prompt, should include the title, content, existing categories and tags', async () => {
    answer({ title: 'T', category: ['Química'], tags: [] });

    await classifier.suggest('id1');

    const message = sentMessage();

    expect(message).toContain('Título atual');
    expect(message).toContain('Texto do documento');
    expect(message).toContain('- Química > Ligações');
    expect(message).toContain('ligação, docker');
  });

  it('when the content is long, should send only the first part', async () => {
    library.get.mockResolvedValue({
      meta: { title: 'T' },
      content: 'a'.repeat(6000) + 'FIM_DO_TEXTO',
    });
    answer({ title: 'T', category: ['Química'], tags: [] });

    await classifier.suggest('id1');

    const message = sentMessage();

    expect(message).not.toContain('FIM_DO_TEXTO');
  });

  it('when the answer comes inside a code fence, should still parse it', async () => {
    answer('```json\n{"title":"Novo","category":["Física"],"tags":["x"]}\n```');

    await expect(classifier.suggest('id1')).resolves.toMatchObject({
      title: 'Novo',
      category: ['Física'],
      tags: ['x'],
    });
  });

  it('when the category matches an existing one ignoring case and accent, should reuse the existing spelling at each level', async () => {
    answer({ title: 'T', category: ['quimica', 'LIGACOES', 'Nova'], tags: [] });

    const result = await classifier.suggest('id1');

    expect(result.category).toEqual(['Química', 'Ligações', 'Nova']);
  });

  it('when the category has more than four levels, should keep only four', async () => {
    answer({ title: 'T', category: ['a', 'b', 'c', 'd', 'e'], tags: [] });

    const result = await classifier.suggest('id1');

    expect(result.category).toEqual(['a', 'b', 'c', 'd']);
  });

  it('when the title is empty, should keep the current title', async () => {
    answer({ title: '  ', category: ['Química'], tags: [] });

    const result = await classifier.suggest('id1');

    expect(result.title).toBe('Título atual');
  });

  it('when tags repeat or match known tags, should dedupe, reuse known spelling and keep accents on new ones', async () => {
    answer({
      title: 'T',
      category: ['Química'],
      tags: ['Ligacao', 'ligação', 'Programação Web', 'DOCKER', 'docker'],
    });

    const result = await classifier.suggest('id1');

    expect(result.tags).toEqual(['ligação', 'programação web', 'docker']);
  });

  it('when there are more than six tags, should keep six', async () => {
    answer({
      title: 'T',
      category: ['Química'],
      tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    });

    const result = await classifier.suggest('id1');

    expect(result.tags).toHaveLength(6);
  });

  it.each([
    ['there is no JSON', 'não sei'],
    ['the JSON is broken', '{"title": '],
    ['the JSON is an array', '[1, 2]'],
    ['the category is missing', '{"title":"T","tags":[]}'],
    ['the category is empty', '{"title":"T","category":[],"tags":[]}'],
    ['the category has an invalid name', '{"title":"T","category":["CON"]}'],
  ])('when %s, should throw BadGatewayException', async (_, text) => {
    answer(text);

    await expect(classifier.suggest('id1')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('when the AI call fails, should throw BadGatewayException', async () => {
    ai.chat.mockRejectedValue(new Error('rede'));

    await expect(classifier.suggest('id1')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('when the document does not exist, should propagate the not found error and not call the AI', async () => {
    library.get.mockRejectedValue(new NotFoundException());

    await expect(classifier.suggest('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(ai.chat).not.toHaveBeenCalled();
  });
});
