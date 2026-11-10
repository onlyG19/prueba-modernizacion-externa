import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { DataSource } from 'typeorm';
import { validateEnv } from '../../src/config/env.validation';
import { buildDataSourceOptions } from '../../src/infrastructure/database/database.options';
import { guardarContenedores } from './contenedores';
import { ENTORNO_E2E } from './entorno-e2e';

/** Las mismas imágenes que docker-compose.yml: se prueba contra lo que corre. */
const IMAGEN_POSTGRES = 'postgres:16.15-alpine';
const IMAGEN_REDIS = 'redis:7.4.12-alpine';
/** Redis con contraseña, como en docker-compose.yml: se prueba ese camino. */
const CLAVE_REDIS = 'clave-redis-e2e';

/**
 * Antes de todos los e2e: Postgres y Redis desechables en contenedores
 * (testcontainers), con el esquema creado por las mismas migraciones que se
 * aplican en producción. Solo requiere Docker: ni el `.env` ni la base de
 * desarrollo intervienen.
 *
 * @remarks Las variables quedan en `process.env`, que los tests heredan y que
 * tiene prioridad sobre un `.env` local. Si el proceso muere sin pasar por el
 * teardown, Ryuk (el recolector de testcontainers) elimina los contenedores.
 */
export default async function globalSetup(): Promise<void> {
  const [postgres, redis] = await Promise.all([
    new PostgreSqlContainer(IMAGEN_POSTGRES).start(),
    new RedisContainer(IMAGEN_REDIS).withPassword(CLAVE_REDIS).start(),
  ]);
  guardarContenedores([postgres, redis]);

  Object.assign(process.env, {
    ...ENTORNO_E2E,
    DB_HOST: postgres.getHost(),
    DB_PORT: String(postgres.getPort()),
    DB_USER: postgres.getUsername(),
    DB_PASSWORD: postgres.getPassword(),
    DB_NAME: postgres.getDatabase(),
    REDIS_HOST: redis.getHost(),
    REDIS_PORT: String(redis.getPort()),
    REDIS_PASSWORD: CLAVE_REDIS,
  });

  // validateEnv también confirma que el entorno de los e2e está completo.
  const baseDeDatos = new DataSource(
    buildDataSourceOptions(validateEnv(process.env)),
  );
  await baseDeDatos.initialize();
  try {
    await baseDeDatos.runMigrations();
  } finally {
    await baseDeDatos.destroy();
  }
}
