import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { violacionesDeAccesibilidad } from '../test/accesibilidad';
import { CREDENCIALES_VALIDAS, crearApiFalsa } from '../test/api-falsa';
import { renderizarSinSesion } from '../test/renderizar';
import { servidor } from '../test/servidor';

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
      await screen.findByRole('heading', { name: 'Registro de usuarios' }),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem('consola-usuarios:sesion:v1')).toContain(
      'token-de-prueba',
    );
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
    // [ANTES] servidor.use(http.post('/api/auth/login', () => HttpResponse.error()));
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
      // [ANTES] http.post('/api/auth/login', () =>
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
