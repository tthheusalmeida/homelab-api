import { requiredEnvKeys } from './env';

/**
 * Valida as variáveis obrigatórias na inicialização. Falha com uma mensagem
 * única listando tudo o que está faltando (ou vazio).
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const missing = requiredEnvKeys.filter((key) => {
    const value = config[key];

    return typeof value !== 'string' || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente ausentes no .env: ${missing.join(', ')}. ` +
        'Use o .env.example como referência.',
    );
  }

  return config;
}
