import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DETALLE_ERROR_INTERNO,
  DETALLE_VALIDACION,
  ProblemDetailsFilter,
  aProblemDetails,
} from './problem-details.filter';

describe('aProblemDetails', () => {
  it('debe usar el mensaje de una HttpException como detail', () => {
    expect(
      aProblemDetails(
        new ConflictException('Ya existe un usuario con el RUT 12345678-5'),
        '/usuarios',
      ),
    ).toEqual({
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      detail: 'Ya existe un usuario con el RUT 12345678-5',
      instance: '/usuarios',
    });
  });

  it('debe poner cada regla de validación incumplida en errors', () => {
    const validacion = new BadRequestException([
      'rut debe ser un RUT válido (ej: 12.345.678-5)',
      'El nombre no puede estar vacío',
    ]);

    expect(aProblemDetails(validacion, '/usuarios')).toMatchObject({
      status: 400,
      title: 'Bad Request',
      detail: DETALLE_VALIDACION,
      errors: [
        'rut debe ser un RUT válido (ej: 12.345.678-5)',
        'El nombre no puede estar vacío',
      ],
    });
  });

  it('debe aceptar una HttpException creada con un texto plano', () => {
    expect(
      aProblemDetails(new HttpException('Sin datos', HttpStatus.GONE), '/x'),
    ).toMatchObject({ status: 410, title: 'Gone', detail: 'Sin datos' });
  });

  it('debe ocultar los detalles de un error inesperado (500)', () => {
    expect(
      aProblemDetails(
        new Error('connection terminated: password=secreto'),
        '/usuarios',
      ),
    ).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: DETALLE_ERROR_INTERNO,
      instance: '/usuarios',
    });
  });
});

describe('ProblemDetailsFilter', () => {
  const ejecutar = (excepcion: unknown) => {
    const json = jest.fn();
    const type = jest.fn(() => ({ json }));
    const status = jest.fn(() => ({ type }));
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', path: '/usuarios' }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
    new ProblemDetailsFilter().catch(excepcion, host);
    return { status, type, json };
  };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('debe responder con el código y el tipo application/problem+json', () => {
    const { status, type, json } = ejecutar(
      new NotFoundException('Usuario con id 9 no encontrado'),
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(type).toHaveBeenCalledWith('application/problem+json');
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 'Usuario con id 9 no encontrado' }),
    );
  });

  it('debe registrar en el log los errores inesperados, no los esperados', () => {
    const registrar = jest.spyOn(Logger.prototype, 'error');

    ejecutar(new ConflictException('duplicado'));
    expect(registrar).not.toHaveBeenCalled();

    ejecutar(new TypeError('x is undefined'));
    expect(registrar).toHaveBeenCalledWith(
      'Error inesperado en GET /usuarios',
      expect.stringContaining('TypeError: x is undefined'),
    );
  });
});
