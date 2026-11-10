import { violacionesDeAccesibilidad } from './apoyo/accesibilidad';
import { etiquetaUnica, rutAlAzar } from './apoyo/datos';
import { expect, test } from './apoyo/fixtures';

/*
 * axe-core dentro del navegador real, con los datos que entrega la API: a
 * diferencia de jsdom (Vitest), aquí sí se renderiza el CSS y se mide el
 * contraste.
 */

test.describe('sin sesión', () => {
  test.use({ sesion: null });

  test('el sitio de inicio y el login no tienen violaciones de accesibilidad', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText(/Actualizado a las/)).toBeVisible();
    expect(await violacionesDeAccesibilidad(page)).toEqual([]);

    await page.goto('/ingresar');
    expect(await violacionesDeAccesibilidad(page)).toEqual([]);
  });
});

test('el panel, la tabla y la ventana de detalle no tienen violaciones de accesibilidad', async ({
  page,
  api,
}) => {
  const etiqueta = etiquetaUnica();
  const usuario = await api.crearUsuario(
    `Carla Soto ${etiqueta}`,
    rutAlAzar().normalizado,
  );

  await page.goto('/panel');
  await expect(
    page.getByText(/visitas al logo|Visitas no disponibles/),
  ).toBeVisible();
  expect(await violacionesDeAccesibilidad(page)).toEqual([]);

  // Tras cada carga se espera la página: la consola llega en un chunk aparte
  // y axe no debe auditar el "Cargando la consola…" de mientras.
  await page.goto('/panel/usuarios/registrar');
  await expect(
    page.getByRole('heading', { name: 'Registrar usuario' }),
  ).toBeVisible();
  expect(await violacionesDeAccesibilidad(page)).toEqual([]);

  await page.goto(`/panel/usuarios?buscar=${etiqueta}`);
  await expect(page.getByRole('row', { name: usuario.nombre })).toBeVisible();
  expect(await violacionesDeAccesibilidad(page)).toEqual([]);
  await page
    .getByRole('button', { name: `Ver detalle de ${usuario.nombre}` })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await violacionesDeAccesibilidad(page)).toEqual([]);
});

test('las páginas de cuentas no tienen violaciones de accesibilidad', async ({
  page,
  api,
}) => {
  const usuario = `cuenta.${etiquetaUnica()}`;
  await api.crearCuenta({ usuario, clave: 'una frase larga y secreta' });

  await page.goto('/panel/cuentas/crear');
  await expect(
    page.getByRole('heading', { name: 'Crear cuenta' }),
  ).toBeVisible();
  expect(await violacionesDeAccesibilidad(page)).toEqual([]);

  await page.goto(`/panel/cuentas?buscar=${usuario}`);
  await expect(page.getByRole('row', { name: usuario })).toBeVisible();
  expect(await violacionesDeAccesibilidad(page)).toEqual([]);
});
