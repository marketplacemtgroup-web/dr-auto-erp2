import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureNestApp } from './app-config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureNestApp(app);
  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`AutoCore API http://0.0.0.0:${port}/api`);
}

bootstrap();
