import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger';
import { API_PREFIX } from './config/common/constants';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix(API_PREFIX);

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
