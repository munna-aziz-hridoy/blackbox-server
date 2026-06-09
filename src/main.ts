import { NestFactory } from '@nestjs/core';
import { existsSync } from 'fs';
import { AppModule } from './app.module';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = process.env.PORT ?? 5000;
  await app.listen(port);
}
bootstrap();
