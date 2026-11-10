import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { violacionesDeAccesibilidad } from '../test/accesibilidad';
import { RUTAS, rutaIngresarVolviendoA } from '../rutas/rutas';
import { CREDENCIALES_VALIDAS, crearApiFalsa } from '../test/api-falsa';
import { renderizarSinSesion } from '../test/renderizar';
import { servidor } from '../test/servidor';

/** Escribe las credenciales válidas y pulsa Ingresar. */
async function ingresarComoAdmin(
  usuario: ReturnType<typeof renderizarSinSesion>['usuario'],
) {
  await usuario.type(
    screen.getByLabelText('Usuario'),
    CREDENCIALES_VALIDAS.username,
  );
  await usuario.type(
    screen.getByLabelText('Contraseña'),
    CREDENCIALES_VALIDAS.password,
  );
  await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
}

function prepararApi() {
  const api = crearApiFalsa();
  servidor.use(...api.handlers);
  return api;
}

describe('Login', () => {
  it('debe entrar a la consola con credenciales válidas', async () => {
    prepararApi();
    const { usuario } = renderizarSinSesion();

    await usuario.type(
      screen.getByLabelText('Usuario'),
      CREDENCIALES_VALIDAS.username,
    );
    await usuario.type(
      screen.getByLabelText('Contraseña'),
      CREDENCIALES_VALIDAS.password,
    );
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(
      await screen.findByRole('heading', { name: 'Resumen' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe(RUTAS.panel);
    expect(sessionStorage.getItem('consola-usuarios:sesion:v1')).toContain(
      'token-de-prueba',
    );
  });

  it('debe llevar, tras ingresar, a la página del panel que se había pedido', async () => {
    prepararApi();
    // Sin sesión, un enlace directo a la tabla pasa primero por el login.
    const { usuario } = renderizarSinSesion(`${RUTAS.usuarios}?buscar=juan`);
    expect(window.location.pathname).toBe(RUTAS.ingresar);

    await ingresarComoAdmin(usuario);

    expect(
      await screen.findByRole('heading', { name: 'Usuarios' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe(RUTAS.usuarios);
    expect(screen.getByLabelText('Buscar por nombre o RUT')).toHaveValue(
      'juan',
    );
  });

  it('no debe redirigir fuera del panel aunque lo pida el enlace (redirección abierta)', async () => {
    prepararApi();
    const origen = window.location.origin;
    const { usuario } = renderizarSinSesion(
      rutaIngresarVolviendoA('https://sitio-falso.cl/robar'),
    );

    await ingresarComoAdmin(usuario);

    expect(
      await screen.findByRole('heading', { name: 'Resumen' }),
    ).toBeInTheDocument();
    expect(window.location.origin).toBe(origen);
    expect(window.location.pathname).toBe(RUTAS.panel);
  });

  it('debe ofrecer volver al sitio de inicio', async () => {
    prepararApi();
    const { usuario } = renderizarSinSesion();

    await usuario.click(screen.getByRole('link', { name: 'Volver al inicio' }));

    expect(window.location.pathname).toBe(RUTAS.inicio);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Tu registro de usuarios/,
      }),
    ).toBeInTheDocument();
  });

  it('debe explicar el error y conservar el usuario escrito si la contraseña es incorrecta', async () => {
    prepararApi();
    const { usuario } = renderizarSinSesion();

    await usuario.type(screen.getByLabelText('Usuario'), 'admin');
    await usuario.type(screen.getByLabelText('Contraseña'), 'mala');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Usuario o contraseña incorrectos.',
    );
    expect(screen.getByLabelText('Usuario')).toHaveValue('admin');
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('debe pedir ambos datos sin llamar a la API si falta alguno', async () => {
    prepararApi();
    const { usuario } = renderizarSinSesion();

    await usuario.type(screen.getByLabelText('Usuario'), 'admin');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Escribe tu usuario y tu contraseña.',
    );
  });

  it('debe avisar cuando el servidor no responde', async () => {
    servidor.use(http.post('/api/v1/auth/login', () => HttpResponse.error()));
    const { usuario } = renderizarSinSesion();

    await usuario.type(screen.getByLabelText('Usuario'), 'admin');
    await usuario.type(screen.getByLabelText('Contraseña'), 'correcta');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor.',
    );
  });

  it('debe pedir esperar si la API limitó los intentos (429)', async () => {
    servidor.use(
      http.post('/api/v1/auth/login', () =>
        HttpResponse.json(
          { type: 'about:blank', title: 'Too Many Requests', status: 429 },
          { status: 429 },
        ),
      ),
    );
    const { usuario } = renderizarSinSesion();

    await usuario.type(screen.getByLabelText('Usuario'), 'admin');
    await usuario.type(screen.getByLabelText('Contraseña'), 'x');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Demasiados intentos de ingreso. Espera un minuto',
    );
  });

  it('no debe tener violaciones de accesibilidad detectables', async () => {
    prepararApi();
    renderizarSinSesion();

    expect(await violacionesDeAccesibilidad()).toEqual([]);
  });
});
