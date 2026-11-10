import { plainToInstance } from 'class-transformer';
import { NormalizeWhitespace } from './normalize-whitespace.decorator';

class Ejemplo {
  @NormalizeWhitespace()
  texto?: unknown;
}

const normalizar = (texto: unknown) =>
  plainToInstance(Ejemplo, { texto }).texto;

describe('NormalizeWhitespace', () => {
  it.each([
    ['  Ana    Rojas  ', 'Ana Rojas'],
    ['\tJuan\n  Pérez ', 'Juan Pérez'],
    ['   ', ''],
    ['María', 'María'],
  ])('debe convertir %j en %j', (entrada, esperado) => {
    expect(normalizar(entrada)).toBe(esperado);
  });

  it('debe dejar intacto lo que no es texto (lo rechaza @IsString)', () => {
    expect(normalizar(123)).toBe(123);
    expect(normalizar(null)).toBeNull();
  });
});
