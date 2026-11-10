import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';
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
  DB_NAME: string;

  @IsString()
  @IsNotEmpty()
  DB_USER: string;

  @IsString()
  @IsNotEmpty()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string = 'localhost';

  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number = 6379;
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

  // [ANTES] if (errores.length > 0) {
  // [ANTES]   const detalle = errores
  // [ANTES]     .flatMap((error) => Object.values(error.constraints ?? {}))
  // [ANTES]     .map((mensaje) => `  - ${mensaje}`)
  // [ANTES]     .join('\n');
  // [ANTES]   throw new Error(`Variables de entorno inválidas:\n${detalle}`);
  // [ANTES] }
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
