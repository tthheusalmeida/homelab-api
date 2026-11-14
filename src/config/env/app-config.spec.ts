import { AppConfig } from './app-config';

describe('AppConfig', () => {
  const original = process.env.LIB_DIR;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.LIB_DIR;
    } else {
      process.env.LIB_DIR = original;
    }
  });

  it('when the variable is set, should return its value', () => {
    process.env.LIB_DIR = '/minha/lib';

    expect(new AppConfig().get('LIB_DIR')).toBe('/minha/lib');
  });

  it('when the variable is missing, should throw naming it', () => {
    delete process.env.LIB_DIR;

    expect(() => new AppConfig().get('LIB_DIR')).toThrow('LIB_DIR');
  });

  it('when the variable is blank, should throw', () => {
    process.env.LIB_DIR = '   ';

    expect(() => new AppConfig().get('LIB_DIR')).toThrow('LIB_DIR');
  });
});
