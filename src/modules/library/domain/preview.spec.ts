import { makePreview } from './preview';

describe('makePreview', () => {
  it('when the body has headings, emphasis and lists, should return plain text', () => {
    const body =
      '# Título\n\nTexto **forte** e _leve_.\n\n- item um\n- item dois';

    expect(makePreview(body)).toBe(
      'Título Texto forte e leve. item um item dois',
    );
  });

  it('when the body has links and images, should keep only their text', () => {
    expect(
      makePreview('Veja [o site](https://x.com) ![logo](https://x.com/a.png)'),
    ).toBe('Veja o site logo');
  });

  it('when the body has a code block, should drop it', () => {
    expect(makePreview('antes\n\n```ts\nconst a = 1;\n```\n\ndepois')).toBe(
      'antes depois',
    );
  });

  it('when the body has a table, should drop the separators and pipes', () => {
    expect(makePreview('| a | b |\n|---|---|\n| 1 | 2 |')).toBe('a b 1 2');
  });

  it('when the text is longer than the limit, should cut it and add an ellipsis', () => {
    const preview = makePreview('palavra '.repeat(100), 20);

    expect(preview.length).toBeLessThanOrEqual(21);
    expect(preview.endsWith('…')).toBe(true);
  });

  it('when the body is empty, should return an empty string', () => {
    expect(makePreview('')).toBe('');
  });
});
