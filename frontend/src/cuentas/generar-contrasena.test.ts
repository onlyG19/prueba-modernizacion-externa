import { describe, expect, it } from 'vitest';
import { generarContrasena, LARGO_GENERADA } from './generar-contrasena';

describe('generarContrasena', () => {
  it(`debe tener ${LARGO_GENERADA} caracteres por defecto, o el largo pedido`, () => {
    expect(generarContrasena()).toHaveLength(LARGO_GENERADA);
    expect(generarContrasena(40)).toHaveLength(40);
  });

  it('no debe usar caracteres que se confunden al leerlos (0, O, 1, l, I)', () => {
    const muchas = Array.from({ length: 200 }, () => generarContrasena()).join(
      '',
    );

    expect(muchas).toMatch(/^[a-zA-Z2-9]+$/);
    expect(muchas).not.toMatch(/[0O1lI]/);
  });

  it('debe dar una distinta cada vez', () => {
    const generadas = new Set(
      Array.from({ length: 50 }, () => generarContrasena()),
    );

    expect(generadas.size).toBe(50);
  });
});
