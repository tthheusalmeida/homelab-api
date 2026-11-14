import { buildCategoryTree, startsWithCategory } from './categories';

describe('buildCategoryTree', () => {
  it('when there are no documents, should return an empty tree', () => {
    expect(buildCategoryTree([])).toEqual([]);
  });

  it('when documents share parents, should merge them and count the subtree', () => {
    const tree = buildCategoryTree([
      ['Ciência', 'DevOps', 'Práticas'],
      ['Ciência', 'DevOps'],
      ['Ciência', 'Redes'],
      ['Química'],
    ]);

    expect(tree.map((n) => [n.name, n.count])).toEqual([
      ['Ciência', 3],
      ['Química', 1],
    ]);
    const science = tree[0];
    expect(science.children.map((n) => [n.name, n.count])).toEqual([
      ['DevOps', 2],
      ['Redes', 1],
    ]);
    expect(science.children[0].children[0]).toMatchObject({
      name: 'Práticas',
      path: ['Ciência', 'DevOps', 'Práticas'],
      count: 1,
      children: [],
    });
  });

  it('when names differ only by case or accent, should merge them keeping the first name', () => {
    const tree = buildCategoryTree([['Química'], ['quimica'], ['QUÍMICA']]);

    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({ name: 'Química', count: 3 });
  });

  it('when sorting, should use natural alphanumeric order at every level', () => {
    const tree = buildCategoryTree([
      ['Zeta'],
      ['Aula 10'],
      ['Aula 2'],
      ['Aula 2', 'b'],
      ['Aula 2', 'a'],
    ]);

    expect(tree.map((n) => n.name)).toEqual(['Aula 2', 'Aula 10', 'Zeta']);
    expect(tree[0].children.map((n) => n.name)).toEqual(['a', 'b']);
  });

  it('when a document has an empty category, should ignore it', () => {
    expect(buildCategoryTree([[]])).toEqual([]);
  });
});

describe('startsWithCategory', () => {
  it('when the prefix matches the first levels, should return true', () => {
    expect(startsWithCategory(['A', 'B', 'C'], ['A', 'B'])).toBe(true);
  });

  it('when comparing, should ignore case and accents', () => {
    expect(startsWithCategory(['Ciência'], ['ciencia'])).toBe(true);
  });

  it('when the prefix is longer or different, should return false', () => {
    expect(startsWithCategory(['A'], ['A', 'B'])).toBe(false);
    expect(startsWithCategory(['A', 'B'], ['A', 'X'])).toBe(false);
  });

  it('when the prefix is empty, should match every category', () => {
    expect(startsWithCategory(['A'], [])).toBe(true);
  });
});
