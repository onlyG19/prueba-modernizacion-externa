import { expect, test, type Page } from '@playwright/test';
import type axe from 'axe-core';

declare global {
  interface Window {
    axe: typeof axe;
  }
}

/** Administrador de la base de datos e2e (ver playwright.config.ts). */
const ADMIN = { usuario: 'admin', clave: 'e2e-clave-de-prueba' };

/** Ingresa con una cuenta (por defecto, la del administrador). */
async function ingresar(pagina: Page, { usuario, clave } = ADMIN) {
  await pagina.goto('/ingresar');
  await pagina.getByLabel('Usuario').fill(usuario);
  await pagina.getByLabel('Contraseña').fill(clave);
  await pagina.getByRole('button', { name: 'Ingresar' }).click();
  await expect(pagina.getByRole('heading', { name: 'Resumen' })).toBeVisible();
}

/** Desde cualquier página del panel: barra lateral → Usuarios → una pestaña. */
async function abrirPestana(
  pagina: Page,
  pestana: 'Tabla de usuarios' | 'Registrar usuario',
) {
  await pagina
    .getByRole('navigation', { name: 'Panel' })
    .getByRole('link', { name: 'Usuarios' })
    .click();
  await pagina
    .getByRole('navigation', { name: 'Secciones de usuarios' })
    .getByRole('link', { name: pestana })
    .click();
}

async function registrar(pagina: Page, nombre: string, rut: string) {
  await pagina.getByLabel('Nombre', { exact: true }).fill(nombre);
  await pagina.getByLabel('RUT', { exact: true }).pressSequentially(rut);
  await pagina.getByRole('button', { name: 'Registrar usuario' }).click();
}

/** Corre axe-core dentro del navegador real: aquí sí se mide el contraste. */
async function violacionesDeAccesibilidad(pagina: Page) {
  // Se mide el estado final: a mitad de una animación de entrada (opacidad
  // parcial) el contraste sale más bajo de lo que de verdad se ve.
  await pagina.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  );
  await pagina.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  return pagina.evaluate(async () =>
    (await window.axe.run()).violations.map(
      (v) => `${v.id}: ${v.help} (${v.nodes.length})`,
    ),
  );
}

test('ciclo completo: registrar, editar, buscar, recargar y eliminar', async ({
  page,
}) => {
  await ingresar(page);
  await abrirPestana(page, 'Registrar usuario');

  await registrar(page, 'Ana Rojas', '111111111');
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Usuario registrado: Ana Rojas.' }),
  ).toBeVisible();
  // El registro está en otra pestaña: el enlace abre la tabla filtrada por su RUT.
  await page.getByRole('link', { name: 'Verlo en la tabla' }).click();
  await expect(page.getByRole('row', { name: /Ana Rojas/ })).toContainText(
    '11.111.111-1',
  );

  // El ojo abre el detalle en una ventana modal; el lápiz, dentro, la edición.
  await page.getByRole('button', { name: 'Ver detalle de Ana Rojas' }).click();
  const ventana = page.getByRole('dialog', { name: 'Ana Rojas' });
  await expect(ventana).toContainText('11.111.111-1');
  // Con `showModal()` el resto de la página queda inerte: Tab recorre la
  // ventana y nunca llega a la tabla de fondo. (Tras el último botón el foco
  // puede ir a la barra del navegador, y entonces `activeElement` es `body`.)
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    const enElFondo = await page.evaluate(
      () =>
        document.activeElement !== document.body &&
        document.activeElement?.closest('dialog') === null,
    );
    expect(enElFondo).toBe(false);
  }
  await ventana.getByRole('button', { name: 'Editar' }).click();
  await ventana.getByLabel('Nombre', { exact: true }).fill('Ana María Rojas');
  await ventana.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(
    page.getByText('Se guardaron los cambios de Ana María Rojas.'),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('row', { name: /Ana María Rojas/ }),
  ).toBeVisible();

  await page.getByLabel('Buscar por nombre o RUT').fill('11.111');
  await expect(page).toHaveURL(/buscar=11\.111/);

  // La sesión (sessionStorage), la búsqueda (URL) y los datos (Postgres) sobreviven.
  await page.reload();
  await expect(page.getByLabel('Buscar por nombre o RUT')).toHaveValue(
    '11.111',
  );
  await expect(
    page.getByRole('row', { name: /Ana María Rojas/ }),
  ).toBeVisible();

  // La búsqueda la resuelve Postgres: sin tildes también encuentra (unaccent).
  await page.getByLabel('Buscar por nombre o RUT').fill('ana maria');
  await expect(page.getByText('1 usuario encontrado')).toBeVisible();
  await expect(
    page.getByRole('row', { name: /Ana María Rojas/ }),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Eliminar a Ana María Rojas' })
    .click();
  await page.getByRole('button', { name: 'Eliminar usuario' }).click();
  await expect(page.getByRole('row', { name: /Ana María Rojas/ })).toHaveCount(
    0,
  );
});

test('un RUT duplicado lo rechaza Postgres (UNIQUE) y la interfaz lo explica', async ({
  page,
}) => {
  await ingresar(page);
  await abrirPestana(page, 'Registrar usuario');

  await registrar(page, 'Primera Persona', '10000013k');
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Usuario registrado: Primera Persona.' }),
  ).toBeVisible();

  // Mismo RUT escrito de otra forma: el backend lo normaliza y choca con UNIQUE.
  await registrar(page, 'Segunda Persona', '10.000.013-K');
  await expect(
    page.getByText(/Ya existe un usuario con el RUT 10\.000\.013-K/),
  ).toBeVisible();
  await abrirPestana(page, 'Tabla de usuarios');
  await expect(
    page.getByRole('row', { name: /Primera Persona/ }),
  ).toBeVisible();
  await expect(page.getByRole('row', { name: /Segunda Persona/ })).toHaveCount(
    0,
  );
});

test('el admin crea una cuenta y la ve en la tabla; quien ingresa con ella gestiona usuarios pero no ve ni crea cuentas', async ({
  page,
}) => {
  await ingresar(page);
  await page
    .getByRole('navigation', { name: 'Panel' })
    .getByRole('link', { name: 'Cuentas' })
    .click();
  // La base e2e parte sin cuentas: la tabla invita a crear la primera.
  await expect(page.getByText(/Todavía no hay cuentas/)).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Secciones de cuentas' })
    .getByRole('link', { name: 'Crear cuenta' })
    .click();

  await page.getByLabel('Usuario', { exact: true }).fill('Operador.E2E');
  await page.getByRole('button', { name: 'Generar una segura' }).click();
  const clave = await page
    .getByLabel('Contraseña', { exact: true })
    .inputValue();
  expect(clave).toHaveLength(16);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  // Postgres la guardó en minúsculas: el usuario no distingue mayúsculas.
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Cuenta creada: operador.e2e.' }),
  ).toBeVisible();
  expect(await violacionesDeAccesibilidad(page)).toEqual([]);

  // La tabla la trae desde Postgres, filtrada por su usuario.
  await page.getByRole('link', { name: 'Verla en la tabla' }).click();
  await expect(page).toHaveURL(/\/panel\/cuentas\?buscar=operador\.e2e$/);
  await expect(page.getByRole('row', { name: /operador\.e2e/ })).toContainText(
    'Operador',
  );
  await expect(page.getByText('1 cuenta encontrada')).toBeVisible();
  expect(await violacionesDeAccesibilidad(page)).toEqual([]);

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await ingresar(page, { usuario: 'operador.e2e', clave });
  const lateral = page.getByRole('navigation', { name: 'Panel' });
  await expect(lateral.getByRole('link', { name: 'Usuarios' })).toBeVisible();
  await expect(lateral.getByRole('link', { name: 'Cuentas' })).toHaveCount(0);

  // Por la URL ve una explicación, no la tabla ni el formulario…
  await page.goto('/panel/cuentas');
  await expect(
    page.getByRole('heading', { name: 'Esta sección es del administrador' }),
  ).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  // …y aunque se saltara la interfaz, la API real le responde 403.
  const token = await page.evaluate(
    () =>
      (
        JSON.parse(
          sessionStorage.getItem('consola-usuarios:sesion:v2') ?? '{}',
        ) as { token?: string }
      ).token,
  );
  const autorizacion = { Authorization: `Bearer ${token}` };
  const listado = await page.request.get('/api/v1/cuentas', {
    headers: autorizacion,
  });
  expect(listado.status()).toBe(403);
  const alta = await page.request.post('/api/v1/cuentas', {
    headers: autorizacion,
    data: { username: 'colada', password: 'una frase larga y secreta' },
  });
  expect(alta.status()).toBe(403);
});

test('la API rechaza peticiones sin token (401)', async ({ request }) => {
  const respuesta = await request.get('/api/v1/usuarios');

  expect(respuesta.status()).toBe(401);
});

test('cerrar sesión vuelve al login y una recarga no recupera la consola', async ({
  page,
}) => {
  await ingresar(page);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(
    page.getByRole('heading', { name: 'Consola de usuarios' }),
  ).toBeVisible();
  await expect(page.getByText('Cerraste sesión.')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();

  // Sin sesión, el panel redirige al login recordando la página pedida.
  await page.goto('/panel/usuarios');
  await expect(page).toHaveURL(/\/ingresar\?volver=%2Fpanel%2Fusuarios$/);
});

test('sin violaciones de accesibilidad en el navegador real, contraste incluido', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText(/Actualizado a las/)).toBeVisible();
  expect(await violacionesDeAccesibilidad(page)).toEqual([]);

  await page.goto('/ingresar');
  expect(await violacionesDeAccesibilidad(page)).toEqual([]);

  await ingresar(page);
  await expect(
    page.getByText(/visitas al logo|Visitas no disponibles/),
  ).toBeVisible();
  expect(await violacionesDeAccesibilidad(page)).toEqual([]);

  // La tabla, y la ventana de detalle abierta sobre ella.
  await abrirPestana(page, 'Registrar usuario');
  await registrar(page, 'Carla Soto', '22222222-2');
  await abrirPestana(page, 'Tabla de usuarios');
  await expect(page.getByRole('row', { name: /Carla Soto/ })).toBeVisible();
  expect(await violacionesDeAccesibilidad(page)).toEqual([]);
  await page.getByRole('button', { name: 'Ver detalle de Carla Soto' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await violacionesDeAccesibilidad(page)).toEqual([]);
});
