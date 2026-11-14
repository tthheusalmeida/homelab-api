import { normalizeText, removeAllegedAuthorship, splitText } from './text';

describe('splitText', () => {
  it('when the text fits the limit, should return one chunk', () => {
    expect(splitText('Uma frase. Outra frase.', 100)).toEqual([
      'Uma frase. Outra frase.',
    ]);
  });

  it('when the text is longer than the limit, should cut at sentence ends', () => {
    expect(splitText('Aaaa aaaa. Bbbb bbbb. Cccc cccc.', 22)).toEqual([
      'Aaaa aaaa. Bbbb bbbb.',
      'Cccc cccc.',
    ]);
  });

  it('when one sentence alone exceeds the limit, should split it between words', () => {
    const chunks = splitText('um dois tres quatro cinco', 10);

    expect(chunks.every((chunk) => chunk.length <= 10)).toBe(true);
    expect(chunks.join(' ')).toBe('um dois tres quatro cinco');
  });

  it('when the text is empty, should return no chunks', () => {
    expect(splitText('', 10)).toEqual([]);
  });

  it('when chunks are joined, should rebuild the original text', () => {
    const text = 'A b c. D e f. G h i. J k l.';

    expect(splitText(text, 8).join(' ')).toBe(text);
  });
});

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
