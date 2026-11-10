import { expect, test, type Page } from '@playwright/test';
import type axe from 'axe-core';

declare global {
  interface Window {
    axe: typeof axe;
  }
}

/** Administrador de la base de datos e2e (ver playwright.config.ts). */
const ADMIN = { usuario: 'admin', clave: 'e2e-clave-de-prueba' };

async function ingresar(pagina: Page) {
  // [ANTES] await pagina.goto('/');
  await pagina.goto('/ingresar');
  await pagina.getByLabel('Usuario').fill(ADMIN.usuario);
  await pagina.getByLabel('Contraseña').fill(ADMIN.clave);
  await pagina.getByRole('button', { name: 'Ingresar' }).click();
  await expect(
    pagina.getByRole('heading', { name: 'Registro de usuarios' }),
  ).toBeVisible();
}

async function registrar(pagina: Page, nombre: string, rut: string) {
  await pagina.getByLabel('Nombre', { exact: true }).fill(nombre);
  await pagina.getByLabel('RUT', { exact: true }).pressSequentially(rut);
  await pagina.getByRole('button', { name: 'Registrar usuario' }).click();
}

/** Corre axe-core dentro del navegador real: aquí sí se mide el contraste. */
async function violacionesDeAccesibilidad(pagina: Page) {
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

  await registrar(page, 'Ana Rojas', '111111111');
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Usuario registrado: Ana Rojas.' }),
  ).toBeVisible();
  await expect(page.getByRole('row', { name: /Ana Rojas/ })).toContainText(
    '11.111.111-1',
  );

  await page.getByRole('button', { name: 'Editar a Ana Rojas' }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Ana María Rojas');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
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

  await registrar(page, 'Primera Persona', '10000013k');
  await expect(
    page.getByRole('row', { name: /Primera Persona/ }),
  ).toBeVisible();

  // Mismo RUT escrito de otra forma: el backend lo normaliza y choca con UNIQUE.
  await registrar(page, 'Segunda Persona', '10.000.013-K');
  await expect(
    page.getByText(/Ya existe un usuario con el RUT 10\.000\.013-K/),
  ).toBeVisible();
  await expect(page.getByRole('row', { name: /Segunda Persona/ })).toHaveCount(
    0,
  );
});

test('la API rechaza peticiones sin token (401)', async ({ request }) => {
  // [ANTES] const respuesta = await request.get('/api/usuarios');
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

  await page.reload();
  await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
});

test('sin violaciones de accesibilidad en el navegador real, contraste incluido', async ({
  page,
}) => {
  await page.goto('/');
  expect(await violacionesDeAccesibilidad(page)).toEqual([]);

  await ingresar(page);
  await expect(
    page.getByText(/visitas al logo|Visitas no disponibles/),
  ).toBeVisible();
  expect(await violacionesDeAccesibilidad(page)).toEqual([]);
});
