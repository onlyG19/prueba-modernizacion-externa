/**
 * Levanta la API real para los tests end-to-end, contra una base de datos
 * exclusiva: los datos de desarrollo nunca se tocan.
 *
 * 1. Crea `prueba_modernizacion_e2e` si no existe (con el driver `pg` del backend).
 * 2. Compila el backend y aplica las migraciones a esa base.
 * 3. Vacía las tablas de usuarios y de cuentas: cada corrida parte de cero.
 * 4. Arranca la API en este mismo proceso, así Playwright la detiene al terminar.
 *
 * Playwright lo ejecuta (ver `webServer` en playwright.config.ts) con el puerto,
 * el secreto JWT y el usuario de prueba en el entorno. Del `.env` de la raíz
 * solo se toman las credenciales de Postgres; en CI no hay `.env` y llegan
 * como variables de entorno del workflow.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const BD_E2E = 'prueba_modernizacion_e2e';

// No sobrescribe lo que ya definió Playwright (PORT, JWT_SECRET, AUTH_*…).
const ARCHIVO_ENV = join(RAIZ, '.env');
if (existsSync(ARCHIVO_ENV)) {
  process.loadEnvFile(ARCHIVO_ENV);
}
process.env.DB_NAME = BD_E2E;

const { Client } = createRequire(join(RAIZ, 'package.json'))('pg');
const conexion = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

const servidorBd = new Client({ ...conexion, database: 'postgres' });
await servidorBd.connect();
try {
  await servidorBd.query(`CREATE DATABASE ${BD_E2E}`);
  console.log(`[e2e] Base de datos ${BD_E2E} creada`);
} catch (error) {
  // 42P04 = la base ya existe: se reutiliza.
  if (error.code !== '42P04') {
    throw error;
  }
} finally {
  await servidorBd.end();
}

const ejecutar = (comando) =>
  execSync(comando, { cwd: RAIZ, stdio: 'inherit', env: process.env });
ejecutar('pnpm build');
ejecutar('pnpm migration:run');

const bd = new Client({ ...conexion, database: BD_E2E });
await bd.connect();
await bd.query('TRUNCATE usuarios, cuentas RESTART IDENTITY');
await bd.end();
console.log(
  `[e2e] Tablas usuarios y cuentas vacías; arrancando la API en :${process.env.PORT}`,
);

// La API lee su configuración (y el .env) desde la raíz del proyecto.
process.chdir(RAIZ);
await import(pathToFileURL(join(RAIZ, 'dist/main.js')).href);
