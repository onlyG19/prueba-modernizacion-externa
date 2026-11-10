import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
// [ANTES] import { ValidationPipe } from '@nestjs/common';
// [ANTES] import { Logger, ValidationPipe } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
// [ANTES] import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './config/app-config';
// [ANTES] import { parseCorsOrigins } from './config/cors';
import { configureApp } from './config/app-setup';
import { Environment } from './config/env.validation';
import { setupSwagger } from './config/swagger';
// [ANTES] import { createValidationPipe } from './config/validation-pipe';

async function bootstrap() {
  // [ANTES] const app = await NestFactory.create(AppModule);
  // [ANTES] const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // bufferLogs: los logs del arranque esperan a que el logger de pino esté listo.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  // Todos los logs de Nest (y los de cada Logger) salen por pino, en JSON.
  app.useLogger(app.get(PinoLogger));

  const config = app.get<AppConfigService>(ConfigService);

  // [ANTES] // ── Proxy de confianza ─────────────────────────────────────────────────────
  // [ANTES] // Detrás de nginx, la IP real del cliente viene en X-Forwarded-For: sin esto,
  // [ANTES] // el límite de peticiones trataría a todos los usuarios como uno solo.
  // [ANTES] const saltosProxy = config.get('TRUST_PROXY', { infer: true });
  // [ANTES] if (saltosProxy > 0) {
  // [ANTES]   app.set('trust proxy', saltosProxy);
  // [ANTES] }
  // ── Proxy, seguridad HTTP, CORS y validación ───────────────────────────────
  // En config/app-setup.ts: los tests e2e configuran la app de la misma forma.
  configureApp(app);

  // ── Apagado ordenado ───────────────────────────────────────────────────────
  // Ante SIGTERM/SIGINT ejecuta los hooks de cierre (p. ej. cerrar Redis).
  app.enableShutdownHooks();

  // [ANTES] // ── Seguridad HTTP ─────────────────────────────────────────────────────────
  // [ANTES] app.use(helmet());
  // [ANTES]
  // [ANTES] // ── CORS ───────────────────────────────────────────────────────────────────
  // [ANTES] app.enableCors({
  // [ANTES]   // [ANTES] origin: process.env.CORS_ORIGIN ?? '*',
  // [ANTES]   // [ANTES] origin: config.get('CORS_ORIGIN', { infer: true }),
  // [ANTES]   origin: parseCorsOrigins(config.get('CORS_ORIGIN', { infer: true })),
  // [ANTES]   methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  // [ANTES]   allowedHeaders: ['Content-Type', 'Authorization'],
  // [ANTES] });
  // [ANTES]
  // [ANTES] // ── Validación global de DTOs ──────────────────────────────────────────────
  // [ANTES] app.useGlobalPipes(
  // [ANTES]   new ValidationPipe({
  // [ANTES]     whitelist: true, // elimina propiedades no declaradas en el DTO
  // [ANTES]     forbidNonWhitelisted: true, // lanza error si llegan propiedades extra
  // [ANTES]     transform: true, // convierte los tipos automáticamente (ej: string → number)
  // [ANTES]     transformOptions: { enableImplicitConversion: true },
  // [ANTES]   }),
  // [ANTES] );
  // [ANTES] app.useGlobalPipes(createValidationPipe());

  // ── Documentación OpenAPI (/docs) ──────────────────────────────────────────
  // Solo fuera de producción: en producción expondría el mapa completo de la
  // API a cualquiera.
  if (config.get('NODE_ENV', { infer: true }) !== Environment.Production) {
    setupSwagger(app);
  }

  // [ANTES] await app.listen(process.env.PORT ?? 3000);
  await app.listen(config.get('PORT', { infer: true }));
}
// [ANTES] bootstrap();
bootstrap().catch((error: unknown) => {
  // Un error al arrancar (p. ej. puerto ocupado) se registra y termina el
  // proceso con código 1, en vez de quedar como promesa rechazada sin manejar.
  new Logger('Bootstrap').error(
    error instanceof Error ? error.stack : String(error),
  );
  process.exit(1);
});
