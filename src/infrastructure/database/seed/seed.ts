import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { validateEnv } from '../../../config/env.validation';
import { Usuario } from '../../../modules/usuarios/entities/usuario.entity';
import { buildDataSourceOptions } from '../database.options';
import { generarUsuariosDemo, leerOpcionesSeed } from './usuarios-demo';

/**
 * Carga usuarios de demostración: `pnpm seed [--cantidad=N] [--forzar]`.
 *
 * @remarks
 * - Requiere el esquema al día (`pnpm migration:run`).
 * - Idempotente: los mismos RUT en cada corrida y `ON CONFLICT DO NOTHING`,
 *   así que repetirlo no duplica usuarios.
 * - Con `NODE_ENV=production` se niega salvo `--forzar`: datos inventados no
 *   deberían terminar en una base real por un descuido.
 */
async function sembrar(): Promise<void> {
  const { cantidad, forzar } = leerOpcionesSeed(process.argv.slice(2));
  if (process.env.NODE_ENV === 'production' && !forzar) {
    throw new Error(
      'NODE_ENV=production: el seed no corre en producción sin --forzar.',
    );
  }

  // La conexión se arma recién aquí, y no importando data-source.ts: ese
  // módulo valida el entorno al cargarse y fallaría antes de la verificación
  // de producción. Como el CLI de migraciones, usa el .env si existe.
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
  const dataSource = new DataSource(
    buildDataSourceOptions(validateEnv(process.env)),
  );
  await dataSource.initialize();
  try {
    const usuarios = generarUsuariosDemo(cantidad);
    const resultado = await dataSource
      .createQueryBuilder()
      .insert()
      .into(Usuario)
      .values(
        usuarios.map(({ nombre, rut, creadoEn }) => ({
          nombre,
          rut,
          creadoEn,
          actualizadoEn: creadoEn,
        })),
      )
      // RUT ya existente (de una corrida anterior o real): se deja como está.
      .orIgnore()
      .execute();

    // Postgres devuelve (RETURNING) solo las filas que sí insertó.
    const insertados = (resultado.raw as unknown[]).length;
    console.log(
      `Seed: ${insertados} usuarios de demo agregados; ${cantidad - insertados} ya existían.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

sembrar().catch((error: unknown) => {
  console.error(
    `Seed fallido: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
