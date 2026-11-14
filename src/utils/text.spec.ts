import { normalizeText, removeAllegedAuthorship } from './text';

describe('normalizeText', () => {
  it('when text has line breaks, should replace them with spaces', () => {
    expect(normalizeText('a\nb\r\nc\rd')).toBe('a b c d');
  });

  it('when text has repeated or edge whitespace, should collapse and trim it', () => {
    expect(normalizeText('  a   b \t c  ')).toBe('a b c');
  });

  it('when input is empty, should return an empty string', () => {
    expect(normalizeText('')).toBe('');
  });
});

describe('removeAllegedAuthorship', () => {
  it('when text ends with the caption signature, should remove it', () => {
    expect(removeAllegedAuthorship('Texto. Legenda por Sônia Ruberti.')).toBe(
      'Texto.',
    );
  });

  it('when the signature has no final dot or different casing, should still remove it', () => {
    expect(removeAllegedAuthorship('Texto legenda por sônia ruberti')).toBe(
      'Texto',
    );
  });

  it('when text has no signature, should keep it unchanged', () => {
    expect(removeAllegedAuthorship('Texto normal')).toBe('Texto normal');
  });

  it('when the signature is in the middle of the text, should not remove it', () => {
    const text = 'Legenda por Sônia Ruberti. Continua aqui';

    expect(removeAllegedAuthorship(text)).toBe(text);
  });
});
