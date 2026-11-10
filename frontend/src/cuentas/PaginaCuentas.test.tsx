import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RUTAS } from '../rutas/rutas';
import { violacionesDeAccesibilidad } from '../test/accesibilidad';
import { CREDENCIALES_OPERADOR, crearApiFalsa } from '../test/api-falsa';
import { renderizarConSesion, renderizarSinSesion } from '../test/renderizar';
import { servidor } from '../test/servidor';
import { LARGO_GENERADA } from './generar-contrasena';

function prepararApi() {
  const api = crearApiFalsa();
  servidor.use(...api.handlers);
  return api;
}

/** La barra lateral, esperando a que cargue la consola (es diferida). */
const barraLateral = () => screen.findByRole('navigation', { name: 'Panel' });
const campoUsuario = () => screen.getByLabelText('Usuario');
const campoContrasena = () => screen.getByLabelText('Contraseña');
const CLAVE_VALIDA = 'una frase larga y secreta';

describe('Cuentas: quién ve la sección', () => {
  it('debe mostrar "Cuentas" en la barra lateral al administrador', async () => {
    prepararApi();
    renderizarConSesion(RUTAS.panel);

    expect(
      within(await barraLateral()).getByRole('link', { name: 'Cuentas' }),
    ).toHaveAttribute('href', RUTAS.cuentas);
  });

  it('no debe mostrar "Cuentas" a quien ingresa con una cuenta de operador', async () => {
    prepararApi();
    const { usuario } = renderizarSinSesion();

    await usuario.type(
      screen.getByLabelText('Usuario'),
      CREDENCIALES_OPERADOR.username,
    );
    await usuario.type(
      screen.getByLabelText('Contraseña'),
      CREDENCIALES_OPERADOR.password,
    );
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    const lateral = await barraLateral();
    expect(
      within(lateral).getByRole('link', { name: 'Usuarios' }),
    ).toBeInTheDocument();
    expect(
      within(lateral).queryByRole('link', { name: 'Cuentas' }),
    ).not.toBeInTheDocument();
  });

  it('debe explicarle a un operador que llega por la URL que la sección es del administrador', async () => {
    prepararApi();
    renderizarConSesion(RUTAS.cuentas, 'operador');

    expect(
      await screen.findByRole('heading', {
        name: 'Esta sección es del administrador',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Crear cuenta' }),
    ).not.toBeInTheDocument();
    expect(await violacionesDeAccesibilidad()).toEqual([]);
  });
});

describe('Crear cuenta', () => {
  it('debe crear la cuenta con el usuario normalizado y dejar el formulario listo para otra', async () => {
    const api = prepararApi();
    const { usuario } = renderizarConSesion(RUTAS.cuentas);

    await usuario.type(
      await screen.findByLabelText('Usuario'),
      ' Maria.Lopez ',
    );
    await usuario.type(campoContrasena(), CLAVE_VALIDA);
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByText('Cuenta creada: maria.lopez.'),
    ).toBeInTheDocument();
    // Se envía como lo guardará la API: sin espacios y en minúsculas.
    expect(api.estado.recibidos.cuentas).toEqual([
      { username: 'maria.lopez', password: CLAVE_VALIDA },
    ]);
    const tarjeta = screen.getByRole('region', { name: 'Cuenta creada' });
    expect(tarjeta).toHaveTextContent('maria.lopez');
    expect(campoUsuario()).toHaveValue('');
    expect(campoContrasena()).toHaveValue('');
    expect(campoUsuario()).toHaveFocus();
    expect(await violacionesDeAccesibilidad()).toEqual([]);
  });

  it('debe validar antes de enviar y llevar el foco al primer campo con error', async () => {
    const api = prepararApi();
    const { usuario } = renderizarConSesion(RUTAS.cuentas);

    await usuario.click(
      await screen.findByRole('button', { name: 'Crear cuenta' }),
    );

    expect(
      screen.getByText('Escribe el usuario de la cuenta.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Escribe una contraseña para la cuenta.'),
    ).toBeInTheDocument();
    expect(campoUsuario()).toHaveFocus();
    expect(campoUsuario()).toHaveAttribute('aria-invalid', 'true');
    expect(api.estado.recibidos.cuentas).toEqual([]);
    expect(await violacionesDeAccesibilidad()).toEqual([]);
  });

  it('debe avisar cuántos caracteres faltan en una contraseña corta al salir del campo', async () => {
    prepararApi();
    const { usuario } = renderizarConSesion(RUTAS.cuentas);

    await usuario.type(await screen.findByLabelText('Contraseña'), 'corta');
    // Mientras escribe no se le marca en rojo.
    expect(screen.queryByText(/al menos 12 caracteres \(lleva/)).toBeNull();
    await usuario.tab();

    expect(
      screen.getByText(
        'La contraseña debe tener al menos 12 caracteres (lleva 5).',
      ),
    ).toBeInTheDocument();
  });

  it('debe mostrar en el campo de usuario que ya está en uso, con el foco ahí', async () => {
    prepararApi();
    const { usuario } = renderizarConSesion(RUTAS.cuentas);

    await usuario.type(
      await screen.findByLabelText('Usuario'),
      CREDENCIALES_OPERADOR.username,
    );
    await usuario.type(campoContrasena(), CLAVE_VALIDA);
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(
      await screen.findByText(
        `El usuario ${CREDENCIALES_OPERADOR.username} ya está en uso. Elige otro.`,
      ),
    ).toBeInTheDocument();
    expect(campoUsuario()).toHaveFocus();
    // La contraseña escrita no se pierde: basta con cambiar el usuario.
    expect(campoContrasena()).toHaveValue(CLAVE_VALIDA);
  });

  it('debe mostrar y ocultar la contraseña', async () => {
    prepararApi();
    const { usuario } = renderizarConSesion(RUTAS.cuentas);

    await usuario.type(await screen.findByLabelText('Contraseña'), 'secreta');
    expect(campoContrasena()).toHaveAttribute('type', 'password');

    await usuario.click(
      screen.getByRole('button', { name: 'Mostrar contraseña' }),
    );
    expect(campoContrasena()).toHaveAttribute('type', 'text');
    expect(screen.getByText('La contraseña está visible.')).toBeInTheDocument();

    await usuario.click(
      screen.getByRole('button', { name: 'Ocultar contraseña' }),
    );
    expect(campoContrasena()).toHaveAttribute('type', 'password');
  });

  it('debe generar una contraseña segura y dejarla visible para copiarla', async () => {
    const api = prepararApi();
    const { usuario } = renderizarConSesion(RUTAS.cuentas);

    await usuario.type(await screen.findByLabelText('Usuario'), 'pedro');
    await usuario.click(
      screen.getByRole('button', { name: 'Generar una segura' }),
    );

    const generada = (campoContrasena() as HTMLInputElement).value;
    expect(generada).toHaveLength(LARGO_GENERADA);
    expect(campoContrasena()).toHaveAttribute('type', 'text');

    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(
      await screen.findByText('Cuenta creada: pedro.'),
    ).toBeInTheDocument();
    expect(api.estado.recibidos.cuentas).toEqual([
      { username: 'pedro', password: generada },
    ]);
  });
});
