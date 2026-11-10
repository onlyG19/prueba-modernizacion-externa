import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Public } from '../../common/decorators/public.decorator';
import { AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard';

const SECRETO = 'secreto-de-pruebas-de-al-menos-32-caracteres';

class ControllerDePrueba {
  privado(): void {}

  @Public()
  publico(): void {}
}

@Public()
class ControllerPublico {
  cualquiera(): void {}
}

/** Arma un ExecutionContext mínimo para una request HTTP. */
const crearContexto = (
  headers: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/unbound-method
  handler: () => void = ControllerDePrueba.prototype.privado,
  clase: abstract new () => unknown = ControllerDePrueba,
) => {
  const request = { headers } as AuthenticatedRequest;
  const context = {
    getHandler: () => handler,
    getClass: () => clase,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
};

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({
    secret: SECRETO,
    verifyOptions: { algorithms: ['HS256'] },
  });
  const guard = new JwtAuthGuard(jwt, new Reflector());

  it('debe dejar pasar un handler marcado con @Public() sin token', async () => {
    const { context } = crearContexto(
      {},
      // eslint-disable-next-line @typescript-eslint/unbound-method
      ControllerDePrueba.prototype.publico,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('debe dejar pasar todo un controller marcado con @Public()', async () => {
    const { context } = crearContexto(
      {},
      // eslint-disable-next-line @typescript-eslint/unbound-method
      ControllerPublico.prototype.cualquiera,
      ControllerPublico,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('debe rechazar una ruta privada sin header Authorization', async () => {
    const { context } = crearContexto({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Falta el token de acceso'),
    );
  });

  it.each([
    ['otro esquema', 'Basic YWRtaW46YWRtaW4='],
    ['Bearer sin token', 'Bearer'],
  ])('debe rechazar un header mal formado (%s)', async (_caso, header) => {
    const { context } = crearContexto({ authorization: header });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Falta el token de acceso',
    );
  });

  it('debe rechazar un token firmado con otro secreto', async () => {
    const ajeno = await new JwtService({
      secret: 'otro-secreto-de-al-menos-32-caracteres!!',
    }).signAsync({ sub: 'admin' });
    const { context } = crearContexto({ authorization: `Bearer ${ajeno}` });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Token inválido o expirado',
    );
  });

  it('debe rechazar un token expirado', async () => {
    const expirado = await jwt.signAsync({ sub: 'admin' }, { expiresIn: -1 });
    const { context } = crearContexto({ authorization: `Bearer ${expirado}` });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Token inválido o expirado',
    );
  });

  it('debe rechazar un token sin firma (alg: none)', async () => {
    const sinFirma = [
      Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url'),
      Buffer.from('{"sub":"admin"}').toString('base64url'),
      '',
    ].join('.');
    const { context } = crearContexto({ authorization: `Bearer ${sinFirma}` });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Token inválido o expirado',
    );
  });

  it('debe aceptar un token válido y dejar el usuario en la request', async () => {
    const token = await jwt.signAsync({ sub: 'admin' });
    const { context, request } = crearContexto({
      authorization: `Bearer ${token}`,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user?.sub).toBe('admin');
  });
});
