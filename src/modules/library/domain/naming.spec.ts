import { BadRequestException } from '@nestjs/common';

import {
  buildFileName,
  compareNatural,
  normalizeKey,
  parseFileName,
  sanitizeCategoryPath,
  sanitizeCategorySegment,
  slugify,
} from './naming';

describe('slugify', () => {
  it('when the title has accents and spaces, should return lowercase words joined by underscore', () => {
    expect(slugify('Práticas da Primeira Maneira')).toBe(
      'praticas_da_primeira_maneira',
    );
  });

  it('when the title has symbols, should drop them', () => {
    expect(slugify('  DevOps: CI/CD (2026)!  ')).toBe('devops_ci_cd_2026');
  });

  it('when the title is empty or only symbols, should fall back to sem_titulo', () => {
    expect(slugify('')).toBe('sem_titulo');
    expect(slugify('???')).toBe('sem_titulo');
  });

  it('when the title is very long, should cut it to 60 chars without a trailing underscore', () => {
    const slug = slugify('palavra '.repeat(30));

    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('_')).toBe(false);
  });
});

describe('buildFileName / parseFileName', () => {
  it('when building, should use the <slug>_<id>.md pattern', () => {
    expect(buildFileName('Segunda Maneira', 'abc-123')).toBe(
      'segunda_maneira_abc-123.md',
    );
  });

  it('when parsing a built name, should return slug and id (id is after the last underscore)', () => {
    const name = buildFileName('Segunda Maneira', '01a1d993-634d');

    expect(parseFileName(name)).toEqual({
      slug: 'segunda_maneira',
      id: '01a1d993-634d',
    });
  });

  it('when the name is not a .md file, should return null', () => {
    expect(parseFileName('segunda_maneira_1.txt')).toBeNull();
  });

  it('when the name has no slug or no id, should return null', () => {
    expect(parseFileName('semid.md')).toBeNull();
    expect(parseFileName('_id.md')).toBeNull();
    expect(parseFileName('slug_.md')).toBeNull();
  });

  it('when names are sorted alphabetically, should group by theme', () => {
    const names = [
      buildFileName('Beta', '1'),
      buildFileName('Alfa', '2'),
      buildFileName('Alfa', '1'),
    ];

    expect(names.sort()).toEqual(['alfa_1.md', 'alfa_2.md', 'beta_1.md']);
  });
});

describe('normalizeKey', () => {
  it('when comparing names, should ignore case, accents and extra spaces', () => {
    expect(normalizeKey('  Ciência   da  Computação ')).toBe(
      'ciencia da computacao',
    );
  });
});

describe('compareNatural', () => {
  it('when strings have numbers, should order them numerically', () => {
    expect(['Aula 10', 'Aula 2', 'Aula 1'].sort(compareNatural)).toEqual([
      'Aula 1',
      'Aula 2',
      'Aula 10',
    ]);
  });

  it('when strings differ only by case or accent, should consider them equal', () => {
    expect(compareNatural('Quimica', 'química')).toBe(0);
  });

  it('when ordering names in pt-BR, should place accented letters with their base letter', () => {
    expect(['Zebra', 'Árvore', 'Banana'].sort(compareNatural)).toEqual([
      'Árvore',
      'Banana',
      'Zebra',
    ]);
  });
});

describe('sanitizeCategorySegment', () => {
  it('when the name is valid, should keep accents and spaces', () => {
    expect(sanitizeCategorySegment('Ciência da Computação')).toBe(
      'Ciência da Computação',
    );
  });

  it('when the name has invalid file characters, should remove them', () => {
    expect(sanitizeCategorySegment('DevOps: CI/CD?')).toBe('DevOps CI CD');
  });

  it('when the name has extra spaces or trailing dots, should clean them', () => {
    expect(sanitizeCategorySegment('  Química.. ')).toBe('Química');
  });

  it.each(['', '   ', '.', '..', '...', '///'])(
    'when the name is %j, should throw',
    (name) => {
      expect(() => sanitizeCategorySegment(name)).toThrow(BadRequestException);
    },
  );

  it('when the name tries to escape the folder, should not keep separators', () => {
    expect(sanitizeCategorySegment('../etc')).toBe('etc');
  });

  it.each(['CON', 'nul', 'Com1', 'LPT9', 'aux.txt'])(
    'when the name is the reserved Windows name %s, should throw',
    (name) => {
      expect(() => sanitizeCategorySegment(name)).toThrow(/reservado/);
    },
  );

  it('when the name exceeds 60 chars, should throw', () => {
    expect(() => sanitizeCategorySegment('a'.repeat(61))).toThrow(
      BadRequestException,
    );
  });
});

describe('sanitizeCategoryPath', () => {
  it('when the path has 1 to 4 levels, should sanitize each level', () => {
    expect(sanitizeCategoryPath([' A ', 'B', 'C', 'D'])).toEqual([
      'A',
      'B',
      'C',
      'D',
    ]);
  });

  it('when the path is empty, should throw', () => {
    expect(() => sanitizeCategoryPath([])).toThrow(BadRequestException);
  });

  it('when the path has more than 4 levels, should throw', () => {
    expect(() => sanitizeCategoryPath(['1', '2', '3', '4', '5'])).toThrow(
      /1 a 4/,
    );
  });

  it('when a level is invalid, should throw', () => {
    expect(() => sanitizeCategoryPath(['ok', '..'])).toThrow(
      BadRequestException,
    );
  });
});
