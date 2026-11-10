import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hashPassword } from '../../common/security/password';
import { EnvironmentVariables } from '../../config/env.validation';
import { AuthService } from './auth.service';
import { JwtPayload } from './jwt-auth.guard';

const SECRETO = 'secreto-de-pruebas-de-al-menos-32-caracteres';

describe('AuthService', () => {
  const jwt = new JwtService({ secret: SECRETO });
  let service: AuthService;

  beforeAll(async () => {
    const variables: Record<string, unknown> = {
      AUTH_USER: 'admin',
      AUTH_PASSWORD_HASH: await hashPassword('correcta'),
      JWT_EXPIRES_IN_SECONDS: 3600,
    };
    const config = {
      get: (clave: string) => variables[clave],
    } as unknown as ConfigService<EnvironmentVariables, true>;

    service = new AuthService(jwt, config);
  });

  it('debe entregar un token Bearer firmado con credenciales válidas', async () => {
    const respuesta = await service.login({
      username: 'admin',
      password: 'correcta',
    });

    expect(respuesta).toMatchObject({ tokenType: 'Bearer', expiresIn: 3600 });
    const payload = await jwt.verifyAsync<JwtPayload>(respuesta.accessToken);
    expect(payload.sub).toBe('admin');
  });

  it.each([
    ['usuario incorrecto', 'otro', 'correcta'],
    ['contraseña incorrecta', 'admin', 'incorrecta'],
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
