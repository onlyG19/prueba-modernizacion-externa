import { describe, expect, it } from 'vitest';
import {
  contarSignificativos,
  formatearRutParcial,
  limpiarRut,
  posicionTrasSignificativos,
  verificarRut,
} from './formato-rut';

describe('limpiarRut', () => {
  it.each([
    ['12.345.678-5', '123456785'],
    ['12345678-k', '12345678K'],
    [' 012.345.678-5 ', '123456785'],
    ['12a345678-5', '123456785'],
    ['1K2345678-5', '123456785'],
  ])('debe dejar "%s" como "%s"', (entrada, esperado) => {
    expect(limpiarRut(entrada)).toBe(esperado);
  });

  it('debe limitar a 8 dígitos de cuerpo más el dígito verificador', () => {
    expect(limpiarRut('1234567890123')).toBe('123456789');
  });
});

describe('formatearRutParcial', () => {
  it.each([
    ['', ''],
    ['1', '1'],
    ['12', '1-2'],
    ['1234', '123-4'],
    ['12345', '1.234-5'],
    ['123456785', '12.345.678-5'],
    ['98765433', '9.876.543-3'],
    ['10000013k', '10.000.013-K'],
  ])('debe formatear "%s" como "%s"', (entrada, esperado) => {
    expect(formatearRutParcial(entrada)).toBe(esperado);
  });

  it('debe ser idempotente: formatear un RUT ya formateado no lo cambia', () => {
    expect(formatearRutParcial('12.345.678-5')).toBe('12.345.678-5');
  });
});

describe('posición del cursor', () => {
  it('debe contar solo dígitos y K antes de la posición', () => {
    expect(contarSignificativos('12.345.678-5', 6)).toBe(5);
  });

  it('debe ubicar el cursor tras el mismo carácter significativo', () => {
    // Tras "12.345": el quinto carácter significativo es el "5".
    expect(posicionTrasSignificativos('12.345.678-5', 5)).toBe(6);
  });

  it('debe ir al inicio con cero caracteres y al final si sobran', () => {
    expect(posicionTrasSignificativos('12.345', 0)).toBe(0);
    expect(posicionTrasSignificativos('12.345', 99)).toBe(6);
  });
});

describe('verificarRut', () => {
  it('debe distinguir vacío e incompleto', () => {
    expect(verificarRut('')).toEqual({ estado: 'vacio' });
    expect(verificarRut('1')).toEqual({ estado: 'incompleto' });
  });

  it('debe aceptar un RUT con dígito verificador correcto y formatearlo', () => {
    expect(verificarRut('123456785')).toEqual({
      estado: 'valido',
      formateado: '12.345.678-5',
    });
  });

  it('debe aceptar la K como dígito verificador, en minúscula o mayúscula', () => {
    expect(verificarRut('10.000.013-k').estado).toBe('valido');
  });

  it('debe informar el dígito verificador esperado cuando no corresponde', () => {
    expect(verificarRut('12.345.678-9')).toEqual({
      estado: 'invalido',
      dvEsperado: '5',
    });
  });
});
