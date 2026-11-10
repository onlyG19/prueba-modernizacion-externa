import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
import type { LevelWithSilent } from 'pino';
import { PASSWORD_HASH_FORMAT } from '../common/security/password';
import { validateCorsOrigins } from './cors';

/** Entornos de ejecución soportados. */
export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Variables de entorno que necesita la aplicación, con su tipo y sus reglas.
 *
 * @remarks
 * Las que tienen un valor inicial son opcionales y ese es su valor por defecto.
 * Las credenciales de la base de datos NO tienen valor por defecto: si faltan,
 * la aplicación no arranca.
 */
export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN: string = '*';

  @IsString()
  @IsNotEmpty()
  DB_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number = 5432;

  @IsString()
  @IsNotEmpty()
  DB_NAME!: string;

  @IsString()
  @IsNotEmpty()
  DB_USER!: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number = 6379;

  /** Contraseña de Redis (`requirepass`). Vacía u omitida: sin autenticación. */
  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  /**
   * Saltos de proxy de confianza (p. ej. 1 detrás de nginx). Con 0, la IP del
   * cliente es la de la conexión. No se debe activar sin un proxy delante:
   * cualquiera podría falsificar su IP con el header X-Forwarded-For.
   */
  @IsInt()
  @Min(0)
  TRUST_PROXY: number = 0;

  /**
   * Nivel mínimo de los logs. Omitido: `info`, y `silent` en los tests.
   */
  @IsOptional()
  @IsIn(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
  LOG_LEVEL?: LevelWithSilent;

  /** Secreto con que se firman los JWT. Sin valor por defecto, a propósito. */
  @IsString()
  @MinLength(32, { message: 'JWT_SECRET debe tener al menos 32 caracteres' })
  JWT_SECRET!: string;

  @IsInt()
  @Min(60)
  JWT_EXPIRES_IN_SECONDS: number = 3600;

  /** Usuario administrador de la API. */
  @IsString()
  @IsNotEmpty()
  AUTH_USER!: string;

  /** Hash scrypt de la contraseña del administrador (nunca la contraseña). */
  @Matches(PASSWORD_HASH_FORMAT, {
    message:
      'AUTH_PASSWORD_HASH debe generarse con: pnpm auth:hash-password <contraseña>',
  })
  AUTH_PASSWORD_HASH!: string;
}

/**
 * Valida y tipa las variables de entorno. Se usa en `ConfigModule.forRoot`.
 *
 * @param config - Variables crudas (todas son strings): `.env` + `process.env`.
 * @returns Las variables convertidas a su tipo, con los valores por defecto aplicados.
 * @throws Error Con la lista completa de variables inválidas o faltantes.
 */
export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errores = validateSync(env);

  const mensajes = errores.flatMap((error) =>
    Object.values(error.constraints ?? {}),
  );

  // Reglas que dependen de más de una variable (CORS depende de NODE_ENV).
  // Solo se evalúan si CORS_ORIGIN pasó las validaciones básicas.
  if (!errores.some((error) => error.property === 'CORS_ORIGIN')) {
    mensajes.push(
      ...validateCorsOrigins(
        env.CORS_ORIGIN,
        env.NODE_ENV === Environment.Production,
      ),
    );
  }

  if (mensajes.length > 0) {
    const detalle = mensajes.map((mensaje) => `  - ${mensaje}`).join('\n');
    throw new Error(`Variables de entorno inválidas:\n${detalle}`);
  }
  return env;
}
