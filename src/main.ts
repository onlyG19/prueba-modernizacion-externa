import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './config/app-config';
import { configureApp } from './config/app-setup';
import { Environment } from './config/env.validation';
import { setupSwagger } from './config/swagger';

async function bootstrap() {
  // bufferLogs: los logs del arranque esperan a que el logger de pino esté listo.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  // Todos los logs de Nest (y los de cada Logger) salen por pino, en JSON.
  app.useLogger(app.get(PinoLogger));

  const config = app.get<AppConfigService>(ConfigService);

  // ── Proxy, seguridad HTTP, CORS y validación ───────────────────────────────
  // En config/app-setup.ts: los tests e2e configuran la app de la misma forma.
  configureApp(app);

  // ── Apagado ordenado ───────────────────────────────────────────────────────
  // Ante SIGTERM/SIGINT ejecuta los hooks de cierre (p. ej. cerrar Redis).
  app.enableShutdownHooks();

  // ── Documentación OpenAPI (/docs) ──────────────────────────────────────────
  // Solo fuera de producción: en producción expondría el mapa completo de la
  // API a cualquiera.
  if (config.get('NODE_ENV', { infer: true }) !== Environment.Production) {
    setupSwagger(app);
  }

  await app.listen(config.get('PORT', { infer: true }));
}
bootstrap().catch((error: unknown) => {
  // Un error al arrancar (p. ej. puerto ocupado) se registra y termina el
  // proceso con código 1, en vez de quedar como promesa rechazada sin manejar.
  new Logger('Bootstrap').error(
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
