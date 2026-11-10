import { ADMIN, CLAVE_SESION, expect, test } from './apoyo/fixtures';
import { enviarLogin } from './apoyo/navegacion';

const AVISO_EXPIRADA = 'Tu sesión expiró. Ingresa de nuevo para continuar.';

test.describe('sin sesión', () => {
  test.use({ sesion: null });

  test('un enlace al panel pasa por el login y, tras un intento fallido, vuelve a la página pedida con su filtro', async ({
    page,
  }) => {
    const pedida = '/panel/cuentas?buscar=operador';
    await page.goto(pedida);
    await expect(page).toHaveURL(
      (url) =>
        url.pathname === '/ingresar' &&
        url.searchParams.get('volver') === pedida,
    );

    // Contraseña equivocada: la API real responde 401 y el usuario escrito
    // se conserva para corregir solo la contraseña.
    await enviarLogin(page, {
      usuario: ADMIN.usuario,
      clave: 'no-es-la-clave',
    });
    await expect(page.getByRole('alert')).toHaveText(
      'Usuario o contraseña incorrectos. Revísalos e inténtalo de nuevo.',
    );
    await expect(page.getByLabel('Usuario')).toHaveValue(ADMIN.usuario);

    await page.getByLabel('Contraseña').fill(ADMIN.clave);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(
      (url) => `${url.pathname}${url.search}` === pedida,
    );
    await expect(page.getByLabel('Buscar por usuario')).toHaveValue('operador');
  });
});

test('cerrar sesión vuelve al login y una recarga no recupera la consola', async ({
  page,
}) => {
  await page.goto('/panel');
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

test.describe('con una cuenta de operador', () => {
  test.use({ sesion: 'operador' });

  test('un token manipulado para hacerse admin lo rechaza la API (firma inválida) y la consola vuelve al login', async ({
    page,
  }) => {
    await page.goto('/panel');
    const lateral = page.getByRole('navigation', { name: 'Panel' });
    await expect(lateral.getByRole('link', { name: 'Usuarios' })).toBeVisible();
    await expect(lateral.getByRole('link', { name: 'Cuentas' })).toHaveCount(0);

    // Quien tiene el token puede leerlo y cambiar el rol que lleva dentro,
    // pero no volver a firmarlo: no conoce el secreto del servidor.
    await page.evaluate((clave) => {
      const base64url = (texto: string) =>
        btoa(texto).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
      const sesion = JSON.parse(sessionStorage.getItem(clave) ?? '{}') as {
        token: string;
      };
      const [cabecera, carga, firma] = sesion.token.split('.');
      const datos = JSON.parse(
        atob(carga.replace(/-/g, '+').replace(/_/g, '/')),
      ) as Record<string, unknown>;
      const token = [
        cabecera,
        base64url(JSON.stringify({ ...datos, rol: 'admin' })),
        firma,
      ].join('.');
      sessionStorage.setItem(
        clave,
        JSON.stringify({ ...sesion, rol: 'admin', token }),
      );
    }, CLAVE_SESION);

    // La interfaz cree que es admin y muestra la sección…
    const cuentas = page.waitForResponse((r) =>
      r.url().includes('/api/v1/cuentas'),
    );
    await page.goto('/panel/cuentas');
    // …pero la API verifica la firma: 401, y la consola cierra la sesión.
    expect((await cuentas).status()).toBe(401);
    await expect(page).toHaveURL((url) => url.pathname === '/ingresar');
    await expect(
      page.getByRole('status').filter({ hasText: AVISO_EXPIRADA }),
    ).toBeVisible();
  });
});
