import { BadRequestException } from '@nestjs/common';
import { MENSAJE_CUERPO_VACIO, NonEmptyBodyPipe } from './non-empty-body.pipe';

describe('NonEmptyBodyPipe', () => {
  const pipe = new NonEmptyBodyPipe();

  it.each([
    ['un objeto vacío', {}],
    ['campos declarados pero sin valor', { nombre: undefined, rut: undefined }],
  ])('debe rechazar %s con 400', (_caso, cuerpo) => {
    expect(() => pipe.transform(cuerpo)).toThrow(
      new BadRequestException(MENSAJE_CUERPO_VACIO),
    );
  });

  it('debe dejar pasar, intacto, un cuerpo con al menos un campo', () => {
    const cuerpo = { nombre: 'Ana Rojas', rut: undefined };

    expect(pipe.transform(cuerpo)).toBe(cuerpo);
  });
});
