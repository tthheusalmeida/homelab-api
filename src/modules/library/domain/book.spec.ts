import {
  BookValidationError,
  bookDocumentIds,
  cleanBookTitle,
  cleanCoverColor,
  cleanCoverImageUrl,
  isBookKind,
  newBook,
  normalizeModules,
  parseBook,
} from './book';

describe('newBook', () => {
  it('when created, should have a trimmed title, default kind and one empty module', () => {
    const book = newBook({ title: '  Pós   em DevOps ' });

    expect(book.title).toBe('Pós em DevOps');
    expect(book.kind).toBe('study');
    expect(book.description).toBe('');
    expect(book.modules).toHaveLength(1);
    expect(book.modules[0]).toMatchObject({ title: '', documentIds: [] });
    expect(book.createdAt).toBe(book.updatedAt);
  });

  it('when kind and description are given, should keep them', () => {
    const book = newBook({
      title: 'T',
      kind: 'pos',
      description: ' Aulas ',
    });

    expect(book.kind).toBe('pos');
    expect(book.description).toBe('Aulas');
  });
});

describe('cleanBookTitle', () => {
  it.each(['', '   ', undefined, 3])(
    'when the title is %p, should throw a validation error',
    (title) => {
      expect(() => cleanBookTitle(title)).toThrow(BookValidationError);
    },
  );
});

describe('isBookKind', () => {
  it.each(['pos', 'course', 'study', 'book'])(
    'when the kind is %s, should accept it',
    (kind) => {
      expect(isBookKind(kind)).toBe(true);
    },
  );

  it('when the kind is unknown, should reject it', () => {
    expect(isBookKind('revista')).toBe(false);
  });
});

describe('normalizeModules', () => {
  it('when modules are valid, should keep order, trim titles and generate missing ids', () => {
    const modules = normalizeModules([
      { id: 'm1', title: ' Módulo 1 ', documentIds: ['a', 'b'] },
      { documentIds: ['c'] },
    ]);

    expect(modules[0]).toEqual({
      id: 'm1',
      title: 'Módulo 1',
      documentIds: ['a', 'b'],
    });
    expect(modules[1].id).toEqual(expect.any(String));
    expect(modules[1].id).not.toBe('m1');
    expect(modules[1].title).toBe('');
  });

  it('when the same document appears twice, should throw', () => {
    expect(() =>
      normalizeModules([{ documentIds: ['a'] }, { documentIds: ['b', 'a'] }]),
    ).toThrow('uma vez');
  });

  it('when two modules share an id, should give the second a new id', () => {
    const modules = normalizeModules([
      { id: 'x', documentIds: [] },
      { id: 'x', documentIds: [] },
    ]);

    expect(modules[0].id).toBe('x');
    expect(modules[1].id).not.toBe('x');
  });

  it('when ids are blank or not texts, should drop them', () => {
    const modules = normalizeModules([
      { documentIds: ['a', ' ', 3 as unknown as string] },
    ]);

    expect(modules[0].documentIds).toEqual(['a']);
  });

  it('when there are no modules, should return one empty module', () => {
    const modules = normalizeModules([]);

    expect(modules).toHaveLength(1);
    expect(modules[0].documentIds).toEqual([]);
  });

  it('when the input is not a list, should throw', () => {
    expect(() => normalizeModules('x' as unknown as [])).toThrow(
      BookValidationError,
    );
  });
});

describe('bookDocumentIds', () => {
  it('when the book has modules, should list ids in reading order', () => {
    const book = newBook({ title: 'T' });
    book.modules = [
      { id: '1', title: '', documentIds: ['a', 'b'] },
      { id: '2', title: 'M', documentIds: ['c'] },
    ];

    expect(bookDocumentIds(book)).toEqual(['a', 'b', 'c']);
  });
});

describe('parseBook', () => {
  it('when the json is a valid book, should return it', () => {
    const book = newBook({ title: 'T' });

    expect(parseBook(JSON.parse(JSON.stringify(book)))).toEqual(book);
  });

  it.each([null, {}, { id: 'x' }, { ...newBook({ title: 'T' }), kind: 'z' }])(
    'when the json is %j, should throw',
    (raw) => {
      expect(() => parseBook(raw)).toThrow('inválido');
    },
  );

  it('when the description is missing, should default to empty', () => {
    const { description: _description, ...rest } = newBook({ title: 'T' });

    expect(parseBook(rest).description).toBe('');
  });
});

describe('book cover', () => {
  it('when created without cover data, should use the default color and no image or subtitle', () => {
    const book = newBook({ title: 'T' });

    expect(book.coverColor).toBe('blue');
    expect(book.coverImageUrl).toBe('');
    expect(book.subtitle).toBe('');
  });

  it('when created with cover data, should keep it cleaned', () => {
    const book = newBook({
      title: 'T',
      subtitle: '  Aulas   da pós ',
      coverColor: 'rose',
      coverImageUrl: ' https://exemplo.com/capa.jpg ',
    });

    expect(book.subtitle).toBe('Aulas da pós');
    expect(book.coverColor).toBe('rose');
    expect(book.coverImageUrl).toBe('https://exemplo.com/capa.jpg');
  });

  describe('cleanCoverColor', () => {
    it.each(['blue', 'emerald', 'violet', 'amber', 'rose', 'slate'])(
      'when the color is %s, should accept it',
      (color) => {
        expect(cleanCoverColor(color)).toBe(color);
      },
    );

    it.each([undefined, null])(
      'when the color is %p, should use the default',
      (value) => {
        expect(cleanCoverColor(value)).toBe('blue');
      },
    );

    it('when the color is unknown, should throw', () => {
      expect(() => cleanCoverColor('pink')).toThrow('Cor de capa inválida');
    });
  });

  describe('cleanCoverImageUrl', () => {
    it.each([undefined, null, '', '   '])(
      'when the url is %p, should return empty',
      (value) => {
        expect(cleanCoverImageUrl(value)).toBe('');
      },
    );

    it('when the url is http or https, should keep it', () => {
      expect(cleanCoverImageUrl('http://a.com/x.png')).toBe(
        'http://a.com/x.png',
      );
      expect(cleanCoverImageUrl('https://a.com/x.png')).toBe(
        'https://a.com/x.png',
      );
    });

    it.each(['ftp://a.com/x.png', 'javascript:alert(1)', 'nao é url', 3])(
      'when the url is %p, should throw',
      (value) => {
        expect(() => cleanCoverImageUrl(value)).toThrow('URL http(s) válida');
      },
    );
  });

  it('when a book saved before covers existed is parsed, should get the cover defaults', () => {
    const {
      subtitle: _s,
      coverColor: _c,
      coverImageUrl: _i,
      ...legacy
    } = newBook({ title: 'Antigo' });

    const book = parseBook(legacy);

    expect(book.coverColor).toBe('blue');
    expect(book.coverImageUrl).toBe('');
    expect(book.subtitle).toBe('');
  });

  it('when the saved color is unknown, should fall back to the default', () => {
    const raw = { ...newBook({ title: 'T' }), coverColor: 'pink' };

    expect(parseBook(raw).coverColor).toBe('blue');
  });
});
