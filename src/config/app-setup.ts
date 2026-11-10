import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppConfigService } from './app-config';
import { parseCorsOrigins } from './cors';
import { createValidationPipe } from './validation-pipe';

/** Prefijo común de las rutas de la API. */
export const PREFIJO_API = 'api';
/** Versión por defecto de las rutas (versionado por URI: `/api/v1/...`). */
export const VERSION_API = '1';
/** Ruta base de la API: `/api/v1`. */
export const RUTA_API = `/${PREFIJO_API}/v${VERSION_API}`;

/**
 * Comportamiento HTTP de la API: rutas bajo `/api/v1`, proxy de confianza,
 * cabeceras de seguridad, CORS y validación de DTOs.
 *
 * @remarks Lo usan `main.ts` y los tests e2e: así los e2e prueban la misma
 * aplicación que corre en producción, no una configurada a mano.
 */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get<AppConfigService>(ConfigService);

  // ── Prefijo y versión: /api/v1/... ─────────────────────────────────────────
  // La ruta es la misma directo o detrás de nginx, y una v2 podría convivir
  // con la v1 sin romper a los clientes. /health queda en la raíz (ver
  // HealthController): lo consultan Docker y los balanceadores, no los clientes.
  app.setGlobalPrefix(PREFIJO_API, { exclude: ['health'] });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: VERSION_API,
  });

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
