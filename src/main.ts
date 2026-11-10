import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './config/app-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get<AppConfigService>(ConfigService);

  // ── Seguridad HTTP ─────────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.enableCors({
    // [ANTES] origin: process.env.CORS_ORIGIN ?? '*',
    origin: config.get('CORS_ORIGIN', { infer: true }),
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
bootstrap();
