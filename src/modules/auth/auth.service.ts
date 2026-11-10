import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { hashPassword, verifyPassword } from '../../common/security/password';
import { EnvironmentVariables } from '../../config/env.validation';
import { CuentasService } from '../cuentas/cuentas.service';
import { AccessTokenDto } from './dto/access-token.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt-auth.guard';

@Injectable()
export class AuthService {
  /**
   * Hash de una contraseña al azar que nadie conoce. Se verifica contra él
   * cuando el usuario no existe, para que esa respuesta tarde lo mismo que
   * una contraseña incorrecta (ver `login`).
   */
  private readonly hashSenuelo = hashPassword(randomBytes(32).toString('hex'));

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly cuentas: CuentasService,
  ) {}

  /**
   * Intercambia credenciales válidas por un token de acceso. Valen las del
   * administrador (`AUTH_USER` en el `.env`, rol `admin`) y las de cualquier
   * cuenta creada por él (rol `operador`).
   *
   * @remarks
   * Siempre se busca la cuenta y siempre se verifica una contraseña, aunque
   * el usuario no exista (contra un hash señuelo). Así ni el mensaje ni el
   * tiempo de respuesta revelan qué usuarios existen.
   *
   * @throws UnauthorizedException Si el usuario o la contraseña no son válidos.
   */
  async login({ username, password }: LoginDto): Promise<AccessTokenDto> {
    const esAdmin = username === this.config.get('AUTH_USER', { infer: true });
    const cuenta = await this.cuentas.buscarPorUsername(username);

    const hash = esAdmin
      ? this.config.get('AUTH_PASSWORD_HASH', { infer: true })
      : (cuenta?.passwordHash ?? (await this.hashSenuelo));
    const passwordValida = await verifyPassword(password, hash);

    const sub = esAdmin ? username : cuenta?.username;
    if (!passwordValida || sub === undefined) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = { sub, rol: esAdmin ? 'admin' : 'operador' };
    return {
      accessToken: await this.jwt.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: this.config.get('JWT_EXPIRES_IN_SECONDS', { infer: true }),
      rol: payload.rol,
    };
  }
}
