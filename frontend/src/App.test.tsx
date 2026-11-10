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
      await screen.findByRole('heading', { name: 'Registro de usuarios' }),
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
      await screen.findByRole('heading', { name: 'Registro de usuarios' }),
    ).toBeInTheDocument();
  });
});
