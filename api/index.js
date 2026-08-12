/**
 * Vercel serverless entry for the NestJS API (single-project monorepo deploy).
 *
 * The build step (`turbo run build --filter=@task-cloud/api`) compiles the Nest
 * app to apps/api/dist; this function wraps that compiled app with an Express
 * adapter and reuses it across warm invocations.
 */
require('reflect-metadata');

const express = require('express');
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');

const { AppModule } = require('../apps/api/dist/app.module');
const { configureApp } = require('../apps/api/dist/app.setup');

let cachedServer;

async function getServer() {
  if (!cachedServer) {
    const expressApp = express();
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      { logger: ['error', 'warn'] },
    );
    configureApp(app);
    await app.init();
    cachedServer = expressApp;
  }
  return cachedServer;
}

module.exports = async (req, res) => {
  const server = await getServer();
  return server(req, res);
};
