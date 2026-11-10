import { NestFactory } from '@nestjs/core';
// [ANTES] import { ValidationPipe } from '@nestjs/common';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './config/app-config';
import { parseCorsOrigins } from './config/cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get<AppConfigService>(ConfigService);

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
