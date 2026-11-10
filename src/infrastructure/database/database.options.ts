import { DataSourceOptions } from 'typeorm';
import { EnvironmentVariables } from '../../config/env.validation';
import { Usuario } from '../../modules/usuarios/entities/usuario.entity';
import { MIGRATIONS } from './migrations';

/** Subconjunto de variables de entorno que necesita la conexión a Postgres. */
export type DatabaseEnv = Pick<
  EnvironmentVariables,
  'DB_HOST' | 'DB_PORT' | 'DB_USER' | 'DB_PASSWORD' | 'DB_NAME'
>;

/**
 * Opciones de conexión a Postgres. Única fuente de verdad, compartida por la
 * app Nest (`app.module.ts`) y por el CLI de migraciones (`data-source.ts`).
 *
 * @remarks
 * `synchronize` está siempre apagado: el esquema solo cambia mediante
 * migraciones revisadas a mano.
 */
export function buildDataSourceOptions(env: DatabaseEnv): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    entities: [Usuario],
    migrations: MIGRATIONS,
    synchronize: false,
    // Ids UUID con gen_random_uuid(), incluida en Postgres desde la v13: sin
    // extensiones que TypeORM intente instalar al conectar.
    uuidExtension: 'pgcrypto',
    installExtensions: false,
  };
}
