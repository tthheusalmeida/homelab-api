/**
 * Variáveis de ambiente obrigatórias. Toda pasta, URL e origem usada pela
 * API vem daqui; nada disso deve ficar fixo no código.
 */
export const EnvKeys = {
  LIB_DIR: 'LIB_DIR',
  TEMP_DOCS_DIR: 'TEMP_DOCS_DIR',
  TEMP_VIDEO_DIR: 'TEMP_VIDEO_DIR',
  TEMP_AUDIO_DIR: 'TEMP_AUDIO_DIR',
  WHISPER_DIR: 'WHISPER_DIR',
  WHISPER_EXECUTABLE: 'WHISPER_EXECUTABLE',
  WHISPER_MODEL: 'WHISPER_MODEL',
  OLLAMA_URL: 'OLLAMA_URL',
  CORS_ORIGIN: 'CORS_ORIGIN',
} as const;

export type EnvKey = (typeof EnvKeys)[keyof typeof EnvKeys];

export const requiredEnvKeys: EnvKey[] = Object.values(EnvKeys);
