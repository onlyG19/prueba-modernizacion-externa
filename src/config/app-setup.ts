import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppConfigService } from './app-config';
import { parseCorsOrigins } from './cors';
import { createValidationPipe } from './validation-pipe';

/**
 * Comportamiento HTTP de la API: proxy de confianza, cabeceras de seguridad,
 * CORS y validación de DTOs.
 *
 * @remarks Lo usan `main.ts` y los tests e2e: así los e2e prueban la misma
 * aplicación que corre en producción, no una configurada a mano.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<AppConfigService>(ConfigService);

  // ── Proxy de confianza ─────────────────────────────────────────────────────
  // Detrás de nginx, la IP real del cliente viene en X-Forwarded-For: sin esto,
  // el límite de peticiones trataría a todos los usuarios como uno solo.
  const saltosProxy = config.get('TRUST_PROXY', { infer: true });
  if (saltosProxy > 0) {
    app.set('trust proxy', saltosProxy);
  }

  // ── Seguridad HTTP ─────────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: parseCorsOrigins(config.get('CORS_ORIGIN', { infer: true })),
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Validación global de DTOs ──────────────────────────────────────────────
  app.useGlobalPipes(createValidationPipe());
}
