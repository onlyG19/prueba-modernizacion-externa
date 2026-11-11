import { etiquetaUnica } from './apoyo/datos';
import { CLAVE_SESION, expect, test } from './apoyo/fixtures';
import { enviarLogin } from './apoyo/navegacion';

test('el admin crea una cuenta y la ve en la tabla; quien ingresa con ella gestiona usuarios pero no ve ni crea cuentas', async ({
  page,
}) => {
  const etiqueta = etiquetaUnica();
  const usuario = `operador.${etiqueta}`;

  await page.goto('/panel');
  await page
    .getByRole('navigation', { name: 'Panel' })
    .getByRole('link', { name: 'Cuentas' })
    .click();
  await page
    .getByRole('navigation', { name: 'Secciones de cuentas' })
    .getByRole('link', { name: 'Crear cuenta' })
    .click();

  // Escrito con mayúsculas: se guarda en minúsculas.
  await page
    .getByLabel('Usuario', { exact: true })
    .fill(`Operador.${etiqueta.toUpperCase()}`);
  await page.getByRole('button', { name: 'Generar una segura' }).click();
  const clave = await page
    .getByLabel('Contraseña', { exact: true })
    .inputValue();
  expect(clave).toHaveLength(16);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: `Cuenta creada: ${usuario}.` }),
  ).toBeVisible();

  // La tabla la trae desde Postgres, filtrada por su usuario.
  await page.getByRole('link', { name: 'Verla en la tabla' }).click();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === '/panel/cuentas' &&
      url.searchParams.get('buscar') === usuario,
  );
  await expect(page.getByRole('row', { name: usuario })).toContainText(
    'Operador',
  );
  await expect(page.getByText('1 cuenta encontrada')).toBeVisible();

  // La cuenta sirve para ingresar: por el formulario, con la clave generada.
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await enviarLogin(page, { usuario, clave });
  await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible();
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
    (clave) =>
      (
        JSON.parse(sessionStorage.getItem(clave) ?? '{}') as {
          token?: string;
        }
      ).token,
    CLAVE_SESION,
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

test('un usuario ya en uso, aunque cambien las mayúsculas, lo rechaza la API (409) y el formulario lo explica', async ({
  page,
  api,
}) => {
  const etiqueta = etiquetaUnica();
  // Creada directo por la API, con mayúsculas: el backend la normaliza solo.
  await api.crearCuenta({
    usuario: `Maria.Lopez.${etiqueta.toUpperCase()}`,
    clave: 'una frase larga y secreta',
  });
  const usuario = `maria.lopez.${etiqueta}`;

  await page.goto('/panel/cuentas/crear');
  const campoUsuario = page.getByLabel('Usuario', { exact: true });
  await campoUsuario.fill(usuario);
  await page
    .getByLabel('Contraseña', { exact: true })
    .fill('otra frase larga y secreta');
  const alta = page.waitForResponse(
    (r) =>
      r.url().includes('/api/v1/cuentas') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  expect((await alta).status()).toBe(409);
  await expect(
    page.getByText(`El usuario ${usuario} ya está en uso. Elige otro.`),
  ).toBeVisible();
  await expect(campoUsuario).toBeFocused();
  await expect(campoUsuario).toHaveAttribute('aria-invalid', 'true');
});

test('la API busca y ordena las cuentas; la búsqueda y el orden quedan en la URL y sobreviven a recargar', async ({
  page,
  api,
}) => {
  const etiqueta = etiquetaUnica();
  for (const nombre of ['ana', 'beto', 'carla']) {
    await api.crearCuenta({
      usuario: `${nombre}.${etiqueta}`,
      clave: 'una frase larga y secreta',
    });
  }

  await page.goto('/panel/cuentas');
  await page.getByLabel('Buscar por usuario').fill(etiqueta);
  await expect(page.getByText('3 cuentas encontradas')).toBeVisible();
  const filas = page.getByRole('row').filter({ hasText: etiqueta });
  await expect(filas.first()).toContainText(`ana.${etiqueta}`);

  const orden = page.getByLabel('Ordenar por');
  await orden.selectOption({ label: 'Usuario (Z–A)' });
  await expect(filas.first()).toContainText(`carla.${etiqueta}`);
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get('buscar') === etiqueta &&
      url.searchParams.get('orden') === '-username',
  );

  await page.reload();
  await expect(orden).toHaveValue('-username');
  await expect(page.getByText('3 cuentas encontradas')).toBeVisible();
  await expect(filas).toHaveCount(3);
  await expect(filas.first()).toContainText(`carla.${etiqueta}`);
});
