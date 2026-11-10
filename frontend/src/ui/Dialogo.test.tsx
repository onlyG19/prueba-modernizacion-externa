import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dialogo } from './Dialogo';

function renderizarDialogo() {
  const onCerrar = vi.fn();
  const usuario = userEvent.setup();
  render(
    <Dialogo idTitulo="titulo" onCerrar={onCerrar}>
      <h2 id="titulo">Detalle</h2>
      <input aria-label="Campo" />
    </Dialogo>,
  );
  return { onCerrar, usuario };
}

describe('Dialogo', () => {
  it('debe abrirse como ventana modal al montarse, nombrada por su título', () => {
    renderizarDialogo();

    expect(screen.getByRole('dialog', { name: 'Detalle' })).toHaveAttribute(
      'open',
    );
  });

  it('debe pedir cerrar con Escape', async () => {
    const { onCerrar, usuario } = renderizarDialogo();

    await usuario.click(screen.getByLabelText('Campo'));
    await usuario.keyboard('{Escape}');

    expect(onCerrar).toHaveBeenCalledOnce();
  });

  it('debe pedir cerrar con un clic en el fondo, pero no con uno dentro', async () => {
    const { onCerrar, usuario } = renderizarDialogo();

    await usuario.click(screen.getByRole('heading', { name: 'Detalle' }));
    expect(onCerrar).not.toHaveBeenCalled();

    // El fondo es el propio <dialog> (no tiene relleno): pulsar y soltar ahí.
    const dialogo = screen.getByRole('dialog');
    fireEvent.pointerDown(dialogo);
    fireEvent.click(dialogo);
    expect(onCerrar).toHaveBeenCalledOnce();
  });

  it('no debe cerrar si la pulsación empezó dentro y se soltó en el fondo', () => {
    const { onCerrar } = renderizarDialogo();

    // Seleccionar texto del campo y soltar el mouse fuera no es "cerrar".
    fireEvent.pointerDown(screen.getByLabelText('Campo'));
    fireEvent.click(screen.getByRole('dialog'));

    expect(onCerrar).not.toHaveBeenCalled();
  });
});
