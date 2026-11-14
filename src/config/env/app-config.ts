import { Global, Injectable, Module } from '@nestjs/common';

import type { EnvKey } from './env';

/**
 * Acesso tipado às variáveis de ambiente validadas na inicialização
 * (ver `validateEnv`). Os serviços dependem desta classe, e não de
 * `process.env`, para que os testes possam injetar valores.
 */
@Injectable()
export class AppConfig {
  get(key: EnvKey): string {
    const value = process.env[key];

    if (value === undefined || value.trim() === '') {
      throw new Error(`Variável de ambiente ausente: ${key}`);
    }

    return value;
  }
}

@Global()
@Module({
  providers: [AppConfig],
  exports: [AppConfig],
})
export class AppConfigModule {}
