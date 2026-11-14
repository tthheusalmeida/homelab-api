import { BadRequestException } from '@nestjs/common';

import { parseDocumentHints } from './document-hints';

describe('parseDocumentHints', () => {
  it('when nothing is given, should return empty hints', () => {
    expect(parseDocumentHints({})).toEqual({});
    expect(
      parseDocumentHints({ title: null, category: null, tags: null }),
    ).toEqual({});
  });

  it('when the title has extra spaces, should trim and collapse them', () => {
    expect(parseDocumentHints({ title: '  Aula   3 \n ' })).toEqual({
      title: 'Aula 3',
    });
  });

  it('when the title is blank, should omit it', () => {
    expect(parseDocumentHints({ title: '   ' })).toEqual({});
  });

  it('when the title is not a text, should throw BadRequestException', () => {
    expect(() => parseDocumentHints({ title: 1 })).toThrow(BadRequestException);
  });

  it('when the title is longer than 120 characters, should throw BadRequestException', () => {
    expect(() => parseDocumentHints({ title: 'a'.repeat(121) })).toThrow(
      BadRequestException,
    );
    expect(parseDocumentHints({ title: 'a'.repeat(120) }).title).toHaveLength(
      120,
    );
  });

  it('when the category has levels, should trim, drop blank ones and sanitize', () => {
    expect(
      parseDocumentHints({ category: [' Tecnologia ', '', 'Dev/Ops'] }),
    ).toEqual({ category: ['Tecnologia', 'Dev Ops'] });
  });

  it('when the category is empty or only blanks, should omit it', () => {
    expect(parseDocumentHints({ category: [] })).toEqual({});
    expect(parseDocumentHints({ category: ['  ', ''] })).toEqual({});
  });

  it('when the category is not a list of texts, should throw BadRequestException', () => {
    expect(() => parseDocumentHints({ category: 'A' })).toThrow(
      BadRequestException,
    );
    expect(() => parseDocumentHints({ category: [1] })).toThrow(
      BadRequestException,
    );
  });

  it('when the category has more than four levels or a reserved name, should throw BadRequestException', () => {
    expect(() =>
      parseDocumentHints({ category: ['a', 'b', 'c', 'd', 'e'] }),
    ).toThrow(BadRequestException);
    expect(() => parseDocumentHints({ category: ['CON'] })).toThrow(
      BadRequestException,
    );
  });

  it('when tags are given, should normalize them: lowercase, trimmed, no duplicates', () => {
    expect(
      parseDocumentHints({ tags: [' Docker ', 'docker', 'CI', ''] }),
    ).toEqual({ tags: ['docker', 'ci'] });
  });

  it('when tags are empty after normalizing, should omit them', () => {
    expect(parseDocumentHints({ tags: ['  '] })).toEqual({});
  });

  it('when tags are not a list of texts, should throw BadRequestException', () => {
    expect(() => parseDocumentHints({ tags: 'a' })).toThrow(
      BadRequestException,
    );
    expect(() => parseDocumentHints({ tags: [1] })).toThrow(
      BadRequestException,
    );
  });
});
