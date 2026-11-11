/**
 * Toma las capturas de la app para la presentación (`pnpm capturas`).
 *
 * Necesita la app corriendo con los usuarios de demostración (`pnpm dev
 * --seed` en la raíz) y la contraseña del administrador:
 *
 *   CAPTURAS_CLAVE=<contraseña> pnpm capturas
 *
 * Opcionales: CAPTURAS_URL (por defecto http://localhost:5173) y
 * CAPTURAS_USUARIO (por defecto admin).
 *
 * Crea cuentas de demostración si no existen y cambia el nombre de un usuario
 * para provocar un 412 (lo deja como estaba). Conviene correrlo contra una
 * base de prueba, no contra datos reales.
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const URL_APP = process.env.CAPTURAS_URL ?? 'http://localhost:5173';
const ADMIN = {
  usuario: process.env.CAPTURAS_USUARIO ?? 'admin',
  clave: process.env.CAPTURAS_CLAVE,
};
if (!ADMIN.clave) {
  throw new Error('Falta CAPTURAS_CLAVE: la contraseña del administrador.');
}

const SALIDA = fileURLToPath(new URL('../public/capturas', import.meta.url));
const API = `${URL_APP}/api/v1`;

/** Cuentas de demostración para la tabla; la última es la del operador. */
const CUENTAS = ['camila.tapia', 'jose.munoz', 'maria.lopez'];
const OPERADOR = { usuario: 'operador.demo', clave: 'una frase larga para la demo' };

const navegador = await chromium.launch();
const opciones = {
  baseURL: URL_APP,
  viewport: { width: 1440, height: 900 },
  // Al doble de resolución: nítidas en un proyector o en el PDF.
  deviceScaleFactor: 2,
  locale: 'es-CL',
  timezoneId: 'America/Santiago',
};

/**
 * Deja la pantalla quieta antes de capturar: el mouse en una esquina vacía
 * (sin hover sobre el último botón usado) y las animaciones de entrada
 * terminadas.
 */
async function quieta(pagina) {
  await pagina.mouse.move(0, 899);
  await pagina.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  // Ninguna imagen rota: el logo admite 30 peticiones por minuto, y varias
  // corridas seguidas lo agotan (429).
  await pagina
    .waitForFunction(
      () => [...document.images].every((imagen) => imagen.complete && imagen.naturalWidth > 0),
      undefined,
      { timeout: 5000 },
    )
    .catch(() => {
      throw new Error(
        'Una imagen no cargó: probablemente el límite de 30 logos por minuto. Espera un minuto y vuelve a correrlo.',
      );
    });
}

async function guardar(destino, nombre) {
  await destino.screenshot({ path: join(SALIDA, nombre), animations: 'disabled' });
  console.log(`capturas/${nombre}`);
}

async function ingresar(pagina, { usuario, clave }) {
  await pagina.goto('/ingresar');
  await pagina.getByLabel('Usuario').fill(usuario);
  await pagina.getByLabel('Contraseña').fill(clave);
  await pagina.getByRole('button', { name: 'Ingresar' }).click();
  await pagina.getByRole('heading', { name: 'Resumen' }).waitFor();
}

/** La API real, con el token del admin, para preparar los datos. */
async function conectarApi(contexto) {
  const login = await contexto.request.post(`${API}/auth/login`, {
    data: { username: ADMIN.usuario, password: ADMIN.clave },
  });
  if (!login.ok()) {
    throw new Error(`No se pudo ingresar como ${ADMIN.usuario} (${login.status()}).`);
  }
  const { accessToken } = await login.json();
  const headers = { Authorization: `Bearer ${accessToken}` };
  return {
    async crearCuenta(username, password) {
      const respuesta = await contexto.request.post(`${API}/cuentas`, {
        headers,
        data: { username, password },
      });
      // 409: ya existe de una corrida anterior.
      if (!respuesta.ok() && respuesta.status() !== 409) {
        throw new Error(`No se pudo crear la cuenta ${username} (${respuesta.status()}).`);
      }
    },
    async usuarios() {
      const respuesta = await contexto.request.get(`${API}/usuarios?limit=20&orden=nombre`, {
        headers,
      });
      return (await respuesta.json()).data;
    },
    async renombrar(id, nombre) {
      const actual = await (await contexto.request.get(`${API}/usuarios/${id}`, { headers })).json();
      await contexto.request.patch(`${API}/usuarios/${id}`, {
        headers: { ...headers, 'If-Match': `"${actual.version}"` },
        data: { nombre },
      });
    },
  };
}

await mkdir(SALIDA, { recursive: true });
const contexto = await navegador.newContext(opciones);
const pagina = await contexto.newPage();
const api = await conectarApi(contexto);

// Inicio: la portada, con el validador de RUT en uso.
await pagina.goto('/');
await pagina.getByText(/Actualizado a las/).waitFor();
await pagina.getByLabel('RUT', { exact: true }).pressSequentially('123456785');
await pagina.getByText('RUT válido').waitFor();
await quieta(pagina);
await guardar(pagina, 'inicio.png');

// Tabla de usuarios con la ventana de detalle abierta.
await ingresar(pagina, ADMIN);
await pagina.goto('/panel/usuarios');
const [primero, segundo] = await api.usuarios();
await pagina.getByRole('button', { name: `Ver detalle de ${primero.nombre}` }).click();
await pagina.getByRole('dialog').waitFor();
await quieta(pagina);
await guardar(pagina, 'tabla-detalle.png');
await pagina.keyboard.press('Escape');

// Registro con un dígito verificador incorrecto: se avisa sin llamar a la API.
await pagina.goto('/panel/usuarios/registrar');
const registro = pagina.getByRole('region', { name: 'Registrar usuario' });
await registro.getByLabel('Nombre', { exact: true }).fill('Valentina Rojas Fuentes');
await registro.getByLabel('RUT', { exact: true }).pressSequentially('123456789');
await registro.getByLabel('RUT', { exact: true }).blur();
await registro.getByText(/debería ser 5/).waitFor();
await quieta(pagina);
await guardar(registro, 'registro-dv.png');
// Sin datos escritos, salir de la página no pide confirmación.
await registro.getByLabel('Nombre', { exact: true }).fill('');
await registro.getByLabel('RUT', { exact: true }).fill('');

// Edición concurrente: otra persona guarda antes y la API responde 412.
await pagina.goto('/panel/usuarios');
await pagina.getByRole('button', { name: `Editar a ${segundo.nombre}` }).click();
const ventana = pagina.getByRole('dialog');
await ventana.getByLabel('Nombre', { exact: true }).waitFor();
await api.renombrar(segundo.id, `${segundo.nombre} Pérez`);
await ventana.getByLabel('Nombre', { exact: true }).fill(`${segundo.nombre} Soto`);
await ventana.getByRole('button', { name: 'Guardar cambios' }).click();
await ventana.getByRole('alert').waitFor();
await quieta(pagina);
await guardar(ventana, 'edicion-412.png');
await pagina.keyboard.press('Escape');
await api.renombrar(segundo.id, segundo.nombre);

// Crear una cuenta con una contraseña generada.
await pagina.goto('/panel/cuentas/crear');
const crear = pagina.getByRole('region', { name: 'Crear cuenta' });
await crear.getByLabel('Usuario', { exact: true }).fill('francisca.vera');
await crear.getByRole('button', { name: 'Generar una segura' }).click();
await quieta(pagina);
await guardar(crear, 'crear-cuenta.png');
await crear.getByLabel('Usuario', { exact: true }).fill('');
await crear.getByLabel('Contraseña', { exact: true }).fill('');

// Tabla de cuentas.
for (const usuario of CUENTAS) {
  await api.crearCuenta(usuario, 'una frase larga para la demo');
}
await api.crearCuenta(OPERADOR.usuario, OPERADOR.clave);
// Una ventana más angosta: la tabla queda más compacta y se lee en la galería.
await pagina.setViewportSize({ width: 1100, height: 900 });
await pagina.goto('/panel/cuentas');
const tabla = pagina.getByRole('region', { name: 'Cuentas creadas' });
await tabla.getByRole('row', { name: new RegExp(OPERADOR.usuario) }).waitFor();
await quieta(pagina);
await guardar(tabla, 'cuentas.png');
await pagina.setViewportSize(opciones.viewport);

// El operador: sin "Cuentas" en la barra lateral, y por la URL, la explicación.
const contextoOperador = await navegador.newContext(opciones);
const operador = await contextoOperador.newPage();
await ingresar(operador, OPERADOR);
await operador.goto('/panel/cuentas');
const sinPermiso = operador.getByRole('region', { name: 'Esta sección es del administrador' });
await sinPermiso.waitFor();
await quieta(operador);
// Desde la barra lateral hasta el aviso, bajo el encabezado.
const lateral = await operador.getByRole('navigation', { name: 'Panel' }).boundingBox();
const caja = await sinPermiso.boundingBox();
await operador.screenshot({
  path: join(SALIDA, 'operador.png'),
  clip: {
    x: 0,
    y: lateral.y,
    width: caja.x + caja.width + 32,
    height: caja.y + caja.height + 32 - lateral.y,
  },
  animations: 'disabled',
});
console.log('capturas/operador.png');

await navegador.close();
