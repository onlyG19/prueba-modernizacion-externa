import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hashPassword } from '../../common/security/password';
import { EnvironmentVariables } from '../../config/env.validation';
import { CuentasService } from '../cuentas/cuentas.service';
import { Cuenta } from '../cuentas/entities/cuenta.entity';
import { AuthService } from './auth.service';
import { JwtPayload } from './jwt-auth.guard';

const SECRETO = 'secreto-de-pruebas-de-al-menos-32-caracteres';

describe('AuthService', () => {
  const jwt = new JwtService({ secret: SECRETO });
  let service: AuthService;
  let buscarPorUsername: jest.Mock<Promise<Cuenta | null>, [string]>;

  beforeAll(async () => {
    const variables: Record<string, unknown> = {
      AUTH_USER: 'admin',
      AUTH_PASSWORD_HASH: await hashPassword('correcta'),
      JWT_EXPIRES_IN_SECONDS: 3600,
    };
    const config = {
      get: (clave: string) => variables[clave],
    } as unknown as ConfigService<EnvironmentVariables, true>;

    const operadora = {
      id: 'c1',
      username: 'maria.lopez',
      passwordHash: await hashPassword('clave-de-la-operadora'),
      creadoEn: new Date(),
    } satisfies Cuenta;
    // Como el servicio real: busca sin distinguir mayúsculas.
    buscarPorUsername = jest.fn((username: string) =>
      Promise.resolve(
        username.trim().toLowerCase() === operadora.username ? operadora : null,
      ),
    );
    const cuentas = { buscarPorUsername } as unknown as CuentasService;

    service = new AuthService(jwt, config, cuentas);
  });

  it('debe entregar un token Bearer de rol admin con las credenciales del .env', async () => {
    const respuesta = await service.login({
      username: 'admin',
      password: 'correcta',
    });

    expect(respuesta).toMatchObject({
      tokenType: 'Bearer',
      expiresIn: 3600,
      rol: 'admin',
    });
    const payload = await jwt.verifyAsync<JwtPayload>(respuesta.accessToken);
    expect(payload).toMatchObject({ sub: 'admin', rol: 'admin' });
  });

  it('debe entregar un token de rol operador con las credenciales de una cuenta', async () => {
    const respuesta = await service.login({
      username: 'Maria.Lopez',
      password: 'clave-de-la-operadora',
    });

    expect(respuesta.rol).toBe('operador');
    const payload = await jwt.verifyAsync<JwtPayload>(respuesta.accessToken);
    // El sub es el usuario como está guardado, no como se escribió.
    expect(payload).toMatchObject({ sub: 'maria.lopez', rol: 'operador' });
  });

  it('debe buscar la cuenta también cuando ingresa el admin (mismo trabajo, mismo tiempo)', async () => {
    buscarPorUsername.mockClear();

    await service.login({ username: 'admin', password: 'correcta' });

    expect(buscarPorUsername).toHaveBeenCalledWith('admin');
  });

  it.each([
    ['usuario inexistente', 'otro', 'correcta'],
    ['contraseña del admin incorrecta', 'admin', 'incorrecta'],
    ['contraseña de la cuenta incorrecta', 'maria.lopez', 'incorrecta'],
    ['contraseña del admin en una cuenta', 'maria.lopez', 'correcta'],
    ['ambos incorrectos', 'otro', 'incorrecta'],
  ])(
    'debe responder 401 con el mismo mensaje (%s)',
    async (_caso, username, password) => {
      await expect(service.login({ username, password })).rejects.toThrow(
        new UnauthorizedException('Credenciales inválidas'),
      );
    },
  );
});
