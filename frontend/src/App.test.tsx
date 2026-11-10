import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RUTAS } from './rutas/rutas';
import { crearApiFalsa } from './test/api-falsa';
import { renderizarConSesion, renderizarSinSesion } from './test/renderizar';
import { servidor } from './test/servidor';

function prepararApi() {
  servidor.use(...crearApiFalsa().handlers);
}

describe('Rutas públicas', () => {
  it('debe abrir el sitio de inicio en / y llevar al login desde "Ingresar"', async () => {
    prepararApi();
    const { usuario } = renderizarSinSesion(RUTAS.inicio);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Tu registro de usuarios/,
      }),
    ).toBeInTheDocument();

    await usuario.click(screen.getByRole('link', { name: 'Ingresar' }));

    expect(window.location.pathname).toBe(RUTAS.ingresar);
    expect(
      screen.getByRole('heading', { name: 'Consola de usuarios' }),
    ).toBeInTheDocument();
  });

  it('debe mostrar una página de "no encontrada" en una ruta desconocida', () => {
    prepararApi();
    renderizarSinSesion('/no-existe');

    expect(
      screen.getByRole('heading', { name: 'No encontramos esta página' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute(
      'href',
      RUTAS.inicio,
    );
  });
});

describe('Con la sesión iniciada', () => {
  it('debe saltarse el login e ir al panel', async () => {
    prepararApi();
    renderizarConSesion(RUTAS.ingresar);

    expect(
      await screen.findByRole('heading', { name: 'Resumen' }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe(RUTAS.panel);
  });

  it('debe ofrecer "Ir al panel" en vez de "Ingresar" en el sitio de inicio', async () => {
    prepararApi();
    const { usuario } = renderizarConSesion(RUTAS.inicio);

    expect(
      screen.queryByRole('link', { name: 'Ingresar' }),
    ).not.toBeInTheDocument();
    await usuario.click(
      within(screen.getByRole('banner')).getByRole('link', {
        name: 'Ir al panel',
      }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Resumen' }),
    ).toBeInTheDocument();
  });
});

describe('Navegación del panel', () => {
  it('debe llegar a cada página desde la barra lateral, marcando la actual', async () => {
    prepararApi();
    const { usuario } = renderizarConSesion(RUTAS.panel);
    const lateral = within(
      await screen.findByRole('navigation', { name: 'Panel' }),
    );

    expect(lateral.getByRole('link', { name: 'Resumen' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await usuario.click(lateral.getByRole('link', { name: 'Usuarios' }));

    expect(window.location.pathname).toBe(RUTAS.usuarios);
    expect(lateral.getByRole('link', { name: 'Usuarios' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(lateral.getByRole('link', { name: 'Resumen' })).not.toHaveAttribute(
      'aria-current',
    );
    // El foco va al título de la página nueva: el lector anuncia dónde se está.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Usuarios' }),
    ).toHaveFocus();
  });

  it('debe cambiar de pestaña en Usuarios conservando el foco en la pestaña', async () => {
    prepararApi();
    const { usuario } = renderizarConSesion(RUTAS.usuarios);
    const pestanas = within(
      await screen.findByRole('navigation', { name: 'Secciones de usuarios' }),
    );
    await screen.findByRole('table');

    const registrar = pestanas.getByRole('link', { name: 'Registrar usuario' });
    await usuario.click(registrar);

    expect(window.location.pathname).toBe(RUTAS.registrarUsuario);
    expect(registrar).toHaveAttribute('aria-current', 'page');
    expect(registrar).toHaveFocus();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    // "Usuarios" sigue marcada en la barra lateral, aunque no sea la página exacta.
    expect(
      within(screen.getByRole('navigation', { name: 'Panel' })).getByRole(
        'link',
        { name: 'Usuarios' },
      ),
    ).toHaveAttribute('data-seccion-activa', 'true');
  });

  it('debe volver con "atrás" del navegador a la página anterior', async () => {
    prepararApi();
    const { usuario } = renderizarConSesion(RUTAS.panel);
    await usuario.click(await screen.findByRole('link', { name: 'Usuarios' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();

    window.history.back();

    expect(
      await screen.findByRole('heading', { name: 'Resumen' }),
    ).toBeInTheDocument();
  });

  it('debe avisar dentro del panel si la sección no existe', async () => {
    prepararApi();
    renderizarConSesion('/panel/no-existe');

    expect(
      await screen.findByRole('heading', { name: 'Esta sección no existe' }),
    ).toBeInTheDocument();
  });
});
