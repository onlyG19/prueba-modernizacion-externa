import { Rut, RutInvalidoError } from './rut';

describe('Rut', () => {
  // ── calcularDv ───────────────────────────────────────────────────────────
  describe('calcularDv', () => {
    it.each([
      ['12345678', '5'],
      ['11111111', '1'],
      ['7654321', '6'],
      ['1', '9'],
      ['10000013', 'K'],
      ['10000004', '0'],
    ])('debe calcular que el DV de %s es %s', (cuerpo, dvEsperado) => {
      expect(Rut.calcularDv(cuerpo)).toBe(dvEsperado);
    });
  });

  // ── normalizar ───────────────────────────────────────────────────────────
  describe('normalizar', () => {
    it.each([
      ['12.345.678-5', '12345678-5'],
      ['123456785', '12345678-5'],
      [' 012345678-5 ', '12345678-5'],
      ['10000013-k', '10000013-K'],
      ['5', '5'],
      ['', ''],
    ])('debe normalizar "%s" a "%s"', (entrada, esperado) => {
      expect(Rut.normalizar(entrada)).toBe(esperado);
    });

    it('debe conservar caracteres inválidos para que la validación los rechace', () => {
      expect(Rut.normalizar('12a345678-5')).toBe('12A345678-5');
    });
  });

  // ── crear ────────────────────────────────────────────────────────────────
  describe('crear', () => {
    it('debe crear un Rut desde un valor válido en cualquier formato', () => {
      expect(Rut.crear('12.345.678-5').toString()).toBe('12345678-5');
    });

    it.each([
      ['12345678-9', 'DV incorrecto'],
      ['12a345678-5', 'letra en el cuerpo'],
      ['123456789-0', 'cuerpo de más de 8 dígitos'],
      ['K', 'solo un carácter'],
      ['', 'vacío'],
    ])('debe lanzar RutInvalidoError con "%s" (%s)', (valor) => {
      expect(() => Rut.crear(valor)).toThrow(RutInvalidoError);
    });

    it('debe incluir el valor original en el mensaje de error', () => {
      expect(() => Rut.crear('12.345.678-9')).toThrow(
        'El RUT "12.345.678-9" no es válido',
      );
    });
  });

  // ── esValido ─────────────────────────────────────────────────────────────
  describe('esValido', () => {
    it('debe retornar true para un RUT válido', () => {
      expect(Rut.esValido('12.345.678-5')).toBe(true);
    });

    it('debe retornar false para un RUT inválido, sin lanzar', () => {
      expect(Rut.esValido('12345678-9')).toBe(false);
    });
  });

  // ── equals ───────────────────────────────────────────────────────────────
  describe('equals', () => {
    it('debe considerar iguales dos RUT escritos en distinto formato', () => {
      expect(Rut.crear('12.345.678-5').equals(Rut.crear('123456785'))).toBe(
        true,
      );
    });

    it('debe considerar distintos dos RUT diferentes', () => {
      expect(Rut.crear('12345678-5').equals(Rut.crear('11111111-1'))).toBe(
        false,
      );
    });
  });

  // ── formatear ────────────────────────────────────────────────────────────
  describe('formatear', () => {
    it.each([
      ['12345678-5', '12.345.678-5'],
      ['7654321-6', '7.654.321-6'],
      ['10000013-K', '10.000.013-K'],
      ['1-9', '1-9'],
    ])('debe formatear %s como %s', (valor, esperado) => {
      expect(Rut.crear(valor).formatear()).toBe(esperado);
    });
  });
});
