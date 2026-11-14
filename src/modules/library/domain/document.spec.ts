import { newPendingMeta, normalizeTags } from './document';

describe('newPendingMeta', () => {
  const now = new Date('2026-11-14T10:00:00.000Z');

  it('when creating, should be pending with empty category and equal timestamps', () => {
    const meta = newPendingMeta({
      id: 'x',
      title: '  Resumo  ',
      type: 'summary',
      now,
    });

    expect(meta).toEqual({
      id: 'x',
      title: 'Resumo',
      type: 'summary',
      source: 'video',
      status: 'pending',
      category: [],
      tags: [],
      createdAt: '2026-11-14T10:00:00.000Z',
      updatedAt: '2026-11-14T10:00:00.000Z',
    });
  });

  it('when a sourceUrl is given, should include it', () => {
    const meta = newPendingMeta({
      id: 'x',
      title: 't',
      type: 'transcription',
      sourceUrl: 'https://x/v.mp4',
    });

    expect(meta.sourceUrl).toBe('https://x/v.mp4');
  });

  it('when category and tags are given, should keep the category and normalize the tags', () => {
    const meta = newPendingMeta({
      id: 'x',
      title: 't',
      type: 'article',
      source: 'manual',
      category: ['A', 'B'],
      tags: [' DevOps ', 'devops'],
    });

    expect(meta).toMatchObject({
      source: 'manual',
      category: ['A', 'B'],
      tags: ['devops'],
    });
  });

  it('when no date is given, should use the current time', () => {
    const meta = newPendingMeta({ id: 'x', title: 't', type: 'summary' });

    expect(Date.parse(meta.createdAt)).not.toBeNaN();
  });
});

describe('normalizeTags', () => {
  it('when tags have case and spaces, should lowercase and trim them', () => {
    expect(normalizeTags([' DevOps ', 'Engenharia'])).toEqual([
      'devops',
      'engenharia',
    ]);
  });

  it('when tags repeat ignoring case or accent, should keep the first', () => {
    expect(normalizeTags(['Química', 'quimica', 'QUÍMICA'])).toEqual([
      'química',
    ]);
  });

  it('when a tag is blank, should drop it', () => {
    expect(normalizeTags(['', '   ', 'ok'])).toEqual(['ok']);
  });
});
