#!/usr/bin/env node
/**
 * Entorno de desarrollo completo con un solo comando, desde la raíz:
 *
 *   pnpm dev            Postgres + Redis, migraciones, API y frontend
 *   pnpm dev --seed     además carga los usuarios de demostración
 *   pnpm dev --sin-docker   si Postgres y Redis ya corren por otro lado
 *
 * 1. Levanta Postgres y Redis con Docker y espera a que estén sanos.
 * 2. Aplica las migraciones pendientes.
 * 3. Arranca la API (`nest start --watch`) y el frontend (Vite) juntos, con la
 *    salida de cada uno prefijada. Ctrl+C detiene ambos.
 *
 * Postgres y Redis quedan corriendo al salir (arrancan al tiro la próxima
 * vez): `docker compose stop` los detiene.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = join(RAIZ, 'frontend');
const EN_WINDOWS = process.platform === 'win32';
const PUERTO_WEB = 5173;

const argumentos = process.argv.slice(2);
const conSeed = argumentos.includes('--seed');
const sinDocker = argumentos.includes('--sin-docker');

const color = (codigo) => (texto) =>
  process.stdout.isTTY ? `\x1b[${codigo}m${texto}\x1b[0m` : texto;
const negrita = color('1');
const tenue = color('2');
const rojo = color('31');
const PREFIJOS = { api: color('36')('[api]'), web: color('35')('[web]') };

const paso = (texto) => console.log(`${negrita('›')} ${texto}`);
function abortar(mensaje, ayuda) {
  console.error(`\n${rojo('✖')} ${mensaje}`);
  if (ayuda) {
    console.error(tenue(`  ${ayuda}`));
  }
  process.exit(1);
}

/** Ejecuta un comando hasta que termine; devuelve su código y su salida. */
function ejecutar(comando, args, { cwd = RAIZ, mostrar = false } = {}) {
  return new Promise((resolver) => {
    const hijo = spawn(comando, args, {
      cwd,
      shell: EN_WINDOWS,
      stdio: mostrar ? 'inherit' : 'pipe',
    });
    let salida = '';
    hijo.stdout?.on('data', (d) => (salida += d));
    hijo.stderr?.on('data', (d) => (salida += d));
    hijo.on('error', (error) => resolver({ codigo: 1, salida: error.message }));
    hijo.on('close', (codigo) => resolver({ codigo, salida }));
  });
}

/** `true` si nadie escucha en el puerto (así un error de "puerto ocupado" se explica antes). */
function puertoLibre(puerto) {
  return new Promise((resolver) => {
    const servidor = createServer()
      .once('error', () => resolver(false))
      .once('listening', () => servidor.close(() => resolver(true)))
      .listen(puerto);
  });
}

// ── 0. Requisitos ────────────────────────────────────────────────────────────
if (!existsSync(join(RAIZ, '.env'))) {
  abortar(
    'Falta el archivo .env en la raíz.',
    'Cópialo de la plantilla y completa los secretos: cp .env.example .env',
  );
}
process.loadEnvFile(join(RAIZ, '.env'));
const PUERTO_API = Number(process.env.PORT ?? 3000);

for (const [carpeta, nombre] of [
  [RAIZ, 'backend'],
  [FRONTEND, 'frontend'],
]) {
  if (!existsSync(join(carpeta, 'node_modules'))) {
    paso(`Instalando dependencias del ${nombre}…`);
    const { codigo } = await ejecutar('pnpm', ['install'], {
      cwd: carpeta,
      mostrar: true,
    });
    if (codigo !== 0) {
      abortar(`No se pudieron instalar las dependencias del ${nombre}.`);
    }
  }
}

for (const [puerto, quien] of [
  [PUERTO_API, 'la API'],
  [PUERTO_WEB, 'el frontend'],
]) {
  if (!(await puertoLibre(puerto))) {
    abortar(
      `El puerto ${puerto} (${quien}) está ocupado.`,
      '¿Quedó corriendo otra instancia? Ciérrala, o revisa quién lo usa: ss -ltnp',
    );
  }
}

// ── 1. Postgres y Redis ──────────────────────────────────────────────────────
if (sinDocker) {
  paso('Postgres y Redis: se usan los que ya están corriendo (--sin-docker).');
} else {
  paso('Levantando Postgres y Redis (Docker)…');
  const { codigo, salida } = await ejecutar('docker', [
    'compose',
    'up',
    '-d',
    '--wait',
    'postgres',
    'redis',
  ]);
  if (codigo !== 0) {
    const sinPermiso = /permission denied/i.test(salida);
    abortar(
      sinPermiso
        ? 'Docker no te deja conectarte (permiso denegado).'
        : `No se pudieron levantar Postgres y Redis:\n${salida.trim()}`,
      sinPermiso
        ? 'Tu sesión aún no toma el grupo "docker": cierra sesión y vuelve a entrar, o ejecuta antes `newgrp docker`.'
        : '¿Está corriendo Docker? Prueba: docker compose up -d postgres redis',
    );
  }
}

// ── 2. Migraciones (y seed opcional) ─────────────────────────────────────────
paso('Aplicando migraciones pendientes…');
const migraciones = await ejecutar('pnpm', ['-s', 'migration:run']);
if (migraciones.codigo !== 0) {
  abortar(`Las migraciones fallaron:\n${migraciones.salida.trim()}`);
}
const aplicadas = (
  migraciones.salida.match(/has been executed successfully/g) ?? []
).length;
console.log(
  tenue(
    aplicadas
      ? `  ${aplicadas} migración(es) aplicada(s).`
      : '  La base ya estaba al día.',
  ),
);

if (conSeed) {
  paso('Cargando usuarios de demostración…');
  const seed = await ejecutar('pnpm', ['-s', 'seed']);
  console.log(tenue(`  ${seed.salida.trim().split('\n').at(-1)}`));
  if (seed.codigo !== 0) {
    abortar('El seed falló.');
  }
}

// ── 3. API y frontend en paralelo ────────────────────────────────────────────
console.log(`
${negrita('Listo para desarrollar:')}
  Frontend  http://localhost:${PUERTO_WEB}
  API       http://localhost:${PUERTO_API}/api/v1
  Swagger   http://localhost:${PUERTO_API}/docs
${tenue('  Ctrl+C detiene la API y el frontend.')}
`);

const procesos = new Map();
let saliendo = false;

/** Detiene un proceso y todos sus hijos (pnpm → nest → node, por ejemplo). */
function detener(hijo) {
  if (hijo.exitCode !== null || hijo.signalCode !== null) {
    return;
  }
  try {
    if (EN_WINDOWS) {
      spawn('taskkill', ['/pid', String(hijo.pid), '/T', '/F']);
    } else {
      // Grupo de procesos propio (detached): se detiene el árbol completo.
      process.kill(-hijo.pid, 'SIGTERM');
    }
  } catch {
    // Ya había terminado.
  }
}

function detenerTodo(codigo = 0) {
  if (saliendo) {
    return;
  }
  saliendo = true;
  process.exitCode = codigo;
  for (const hijo of procesos.values()) {
    detener(hijo);
  }
}

function arrancar(nombre, args, { cwd, env = {} }) {
  const hijo = spawn('pnpm', args, {
    cwd,
    shell: EN_WINDOWS,
    detached: !EN_WINDOWS,
    stdio: ['ignore', 'pipe', 'pipe'],
    // Con la salida redirigida, Nest, Vite y pino-pretty apagan los colores.
    env: { ...process.env, FORCE_COLOR: '1', ...env },
  });
  procesos.set(nombre, hijo);
  for (const flujo of [hijo.stdout, hijo.stderr]) {
    createInterface({ input: flujo }).on('line', (linea) =>
      console.log(`${PREFIJOS[nombre]} ${linea}`),
    );
  }
  hijo.on('exit', (codigo, senal) => {
    procesos.delete(nombre);
    if (!saliendo) {
      // Si uno muere solo, no tiene sentido dejar el otro corriendo.
      console.error(
        `\n${rojo('✖')} ${nombre} terminó (${senal ?? `código ${codigo}`}); deteniendo el resto.`,
      );
      detenerTodo(1);
    }
    if (procesos.size === 0) {
      console.log(
        tenue(
          '\nAPI y frontend detenidos. Postgres y Redis siguen arriba: `docker compose stop` los detiene.',
        ),
      );
      process.exit();
    }
  });
}

arrancar('api', ['start:dev'], { cwd: RAIZ });
arrancar('web', ['dev'], {
  cwd: FRONTEND,
  // El proxy de Vite apunta a la API, aunque PORT no sea el 3000.
  env: { API_PROXY_TARGET: `http://localhost:${PUERTO_API}` },
});

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => detenerTodo(0));
}
