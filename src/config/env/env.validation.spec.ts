import { requiredEnvKeys } from './env';
import { validateEnv } from './env.validation';

const complete = () =>
  Object.fromEntries(requiredEnvKeys.map((key) => [key, `valor-${key}`]));

describe('validateEnv', () => {
  it('when every required variable is set, should return the config', () => {
    const config = complete();

    expect(validateEnv(config)).toBe(config);
  });

  it('when a variable is missing, should throw naming it', () => {
    const config = complete();
    delete config.LIB_DIR;

    expect(() => validateEnv(config)).toThrow('LIB_DIR');
  });

  it('when a variable is blank, should treat it as missing', () => {
    expect(() => validateEnv({ ...complete(), OLLAMA_URL: '  ' })).toThrow(
      'OLLAMA_URL',
    );
  });

  it('when several variables are missing, should list all of them in one error', () => {
    const config = complete();
    delete config.LIB_DIR;
    delete config.WHISPER_DIR;

    expect(() => validateEnv(config)).toThrow(/LIB_DIR.*WHISPER_DIR/);
  });

  it('when no variable is set, should mention the .env.example', () => {
    expect(() => validateEnv({})).toThrow('.env.example');
  });

  it('when extra variables exist, should ignore them', () => {
    expect(() => validateEnv({ ...complete(), OUTRA: 'x' })).not.toThrow();
  });
});
