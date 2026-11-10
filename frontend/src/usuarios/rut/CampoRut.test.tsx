import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { CampoRut } from './CampoRut';

/** CampoRut es controlado: se prueba con un dueño de estado mínimo. */
function Envoltorio({ error }: { error?: string }) {
  const [valor, setValor] = useState('');
  return <CampoRut id="rut" valor={valor} onCambio={setValor} error={error} />;
}

describe('CampoRut', () => {
  it('debe formatear el RUT mientras se escribe', async () => {
    const usuario = userEvent.setup();
    render(<Envoltorio />);
    const campo = screen.getByLabelText('RUT');

    await usuario.type(campo, '123456785');

    expect(campo).toHaveValue('12.345.678-5');
  });

  it('debe confirmar en el momento cuando el dígito verificador corresponde', async () => {
    const usuario = userEvent.setup();
    render(<Envoltorio />);

    await usuario.type(screen.getByLabelText('RUT'), '10000013k');

    expect(screen.getByLabelText('RUT')).toHaveValue('10.000.013-K');
    expect(screen.getByText('RUT válido')).toBeInTheDocument();
  });

  it('no debe confirmar un RUT con dígito verificador incorrecto', async () => {
    const usuario = userEvent.setup();
    render(<Envoltorio />);

    await usuario.type(screen.getByLabelText('RUT'), '123456789');

    expect(screen.queryByText('RUT válido')).not.toBeInTheDocument();
  });

  it('debe aceptar un RUT pegado con puntos y guion', async () => {
    const usuario = userEvent.setup();
    render(<Envoltorio />);
    const campo = screen.getByLabelText('RUT');

    campo.focus();
    await usuario.paste('12.345.678-5');

    expect(campo).toHaveValue('12.345.678-5');
  });

  it('debe mantener el cursor en su lugar al corregir un dígito en medio', async () => {
    const usuario = userEvent.setup();
    render(<Envoltorio />);
    const campo = screen.getByLabelText<HTMLInputElement>('RUT');
    await usuario.type(campo, '123456785');

    // Borra el "3" (posición 3 en "12.345.678-5") y escribe un "9".
    campo.setSelectionRange(4, 4);
    await usuario.keyboard('{Backspace}9');

    expect(campo).toHaveValue('12.945.678-5');
    expect(campo.selectionStart).toBe(4);
  });

  it('debe mostrar el error recibido y marcar el campo como inválido', () => {
    render(<Envoltorio error="El RUT está incompleto." />);
    const campo = screen.getByLabelText('RUT');

    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription(
      expect.stringContaining('El RUT está incompleto.'),
    );
  });
});
