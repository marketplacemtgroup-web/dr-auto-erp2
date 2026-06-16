import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import { configureNestApp } from './app-config';

export async function createExpressApp(): Promise<express.Application> {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  const app = await NestFactory.create<NestExpressApplication>(AppModule, adapter, {
    logger: process.env.NODE_ENV === 'production' ? ['error', 'warn', 'log'] : undefined,
  });
  configureNestApp(app);
  await app.init();
  return expressApp;
}

let cachedApp: express.Application | null = null;

export async function getExpressApp(): Promise<express.Application> {
  if (!cachedApp) {
    cachedApp = await createExpressApp();
  }
  return cachedApp;
}
