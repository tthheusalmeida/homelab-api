import { hasProperty, isObject, isString } from './type-guards';

describe('isObject', () => {
  it('when value is an object or array, should return true', () => {
    expect(isObject({})).toBe(true);
    expect(isObject([])).toBe(true);
  });

  it('when value is null or a primitive, should return false', () => {
    expect(isObject(null)).toBe(false);
    expect(isObject(undefined)).toBe(false);
    expect(isObject('x')).toBe(false);
    expect(isObject(1)).toBe(false);
  });
});

describe('isString', () => {
  it('when value is a string, should return true, otherwise false', () => {
    expect(isString('')).toBe(true);
    expect(isString(1)).toBe(false);
    expect(isString(null)).toBe(false);
  });
});

describe('hasProperty', () => {
  it('when the property exists even with undefined value, should return true', () => {
    expect(hasProperty({ a: undefined }, 'a')).toBe(true);
  });

  it('when the property does not exist, should return false', () => {
    expect(hasProperty({ a: 1 }, 'b')).toBe(false);
  });
});
