import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger';
import { API_PREFIX } from './config/common/constants';
import { EnvKeys } from './config/env/env';
import { AppConfig } from './config/env/app-config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: app.get(AppConfig).get(EnvKeys.CORS_ORIGIN),
    credentials: true,
  });
  app.setGlobalPrefix(API_PREFIX);

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
