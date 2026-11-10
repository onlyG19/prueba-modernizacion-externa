import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
// [ANTES] import { ValidationPipe } from '@nestjs/common';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './config/app-config';
import { parseCorsOrigins } from './config/cors';
import { Environment } from './config/env.validation';
import { setupSwagger } from './config/swagger';

async function bootstrap() {
  // [ANTES] const app = await NestFactory.create(AppModule);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = app.get<AppConfigService>(ConfigService);

  // ── Proxy de confianza ─────────────────────────────────────────────────────
  // Detrás de nginx, la IP real del cliente viene en X-Forwarded-For: sin esto,
  // el límite de peticiones trataría a todos los usuarios como uno solo.
  const saltosProxy = config.get('TRUST_PROXY', { infer: true });
  if (saltosProxy > 0) {
    app.set('trust proxy', saltosProxy);
  }

  // ── Apagado ordenado ───────────────────────────────────────────────────────
  // Ante SIGTERM/SIGINT ejecuta los hooks de cierre (p. ej. cerrar Redis).
  app.enableShutdownHooks();

  // ── Seguridad HTTP ─────────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.enableCors({
    // [ANTES] origin: process.env.CORS_ORIGIN ?? '*',
    // [ANTES] origin: config.get('CORS_ORIGIN', { infer: true }),
    origin: parseCorsOrigins(config.get('CORS_ORIGIN', { infer: true })),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Validación global de DTOs ──────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // elimina propiedades no declaradas en el DTO
      forbidNonWhitelisted: true, // lanza error si llegan propiedades extra
      transform: true, // convierte los tipos automáticamente (ej: string → number)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

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
