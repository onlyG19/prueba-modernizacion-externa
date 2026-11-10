import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RUTAS } from '../rutas/rutas';
import { violacionesDeAccesibilidad } from '../test/accesibilidad';
import { crearApiFalsa, type EscenarioApiFalsa } from '../test/api-falsa';
import { renderizarSinSesion } from '../test/renderizar';
import { servidor } from '../test/servidor';

function prepararApi(escenario?: EscenarioApiFalsa) {
  servidor.use(...crearApiFalsa(escenario).handlers);
}

describe('Sitio de inicio', () => {
  it('debe probar el validador de RUT sin ingresar', async () => {
    prepararApi();
    const { usuario } = renderizarSinSesion(RUTAS.inicio);
    const rut = screen.getByLabelText('RUT');

    await usuario.type(rut, '123456789');
    expect(rut).toHaveValue('12.345.678-9');
    expect(
      screen.getByText('Con este número, el dígito verificador debería ser 5.'),
    ).toBeInTheDocument();

    await usuario.clear(rut);
    await usuario.type(rut, '123456785');
    expect(screen.getByText('RUT válido')).toBeInTheDocument();
    expect(
      screen.getByText(/El dígito verificador corresponde/),
    ).toHaveTextContent('Se guarda sin puntos: 12345678-5.');
  });

  it('debe mostrar en vivo las visitas al logo', async () => {
    prepararApi({ visitas: 1234 });
    renderizarSinSesion(RUTAS.inicio);

    expect(await screen.findByText('1.234')).toBeInTheDocument();
    expect(screen.getByText('En línea')).toBeInTheDocument();
    expect(
      screen.getByText(/^Actualizado a las \d{2}:\d{2}\.$/),
    ).toBeInTheDocument();
  });

  it('debe decir que el contador no está disponible si Redis está caído', async () => {
    prepararApi({ redisDisponible: false });
    renderizarSinSesion(RUTAS.inicio);

    expect(await screen.findByText('No disponible')).toBeInTheDocument();
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
  });

  it('debe llevar los accesos del panel al login, recordando a dónde se iba', async () => {
    prepararApi();
    const { usuario } = renderizarSinSesion(RUTAS.inicio);

    await usuario.click(
      screen.getByRole('link', { name: 'Registra a una persona' }),
    );

    expect(window.location.pathname).toBe(RUTAS.ingresar);
    expect(new URLSearchParams(window.location.search).get('volver')).toBe(
      RUTAS.registrarUsuario,
    );
  });

  it('no debe tener violaciones de accesibilidad detectables', async () => {
    prepararApi();
    renderizarSinSesion(RUTAS.inicio);
    await screen.findByText('En línea');

    expect(await violacionesDeAccesibilidad()).toEqual([]);
  });
});
