import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { verifyPassword } from '../../common/security/password';
import { EnvironmentVariables } from '../../config/env.validation';
import { AccessTokenDto } from './dto/access-token.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt-auth.guard';

// [ANTES] /** Respuesta del login. */
// [ANTES] export interface AccessTokenResponse {
// [ANTES]   accessToken: string;
// [ANTES]   tokenType: 'Bearer';
// [ANTES]   /** Segundos de vigencia del token. */
// [ANTES]   expiresIn: number;
// [ANTES] }

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  /**
   * Intercambia credenciales válidas por un token de acceso.
   *
   * @remarks
   * La contraseña se verifica aunque el usuario no coincida, y ambos errores
   * responden igual: así ni el mensaje ni el tiempo de respuesta revelan si el
   * usuario existe.
   *
   * @throws UnauthorizedException Si el usuario o la contraseña no son válidos.
   */
  // [ANTES] async login({ username, password }: LoginDto): Promise<AccessTokenResponse> {
  async login({ username, password }: LoginDto): Promise<AccessTokenDto> {
    const passwordValida = await verifyPassword(
      password,
      this.config.get('AUTH_PASSWORD_HASH', { infer: true }),
    );
    const usuarioValido =
      username === this.config.get('AUTH_USER', { infer: true });

    if (!usuarioValido || !passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = { sub: username };
    return {
      accessToken: await this.jwt.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: this.config.get('JWT_EXPIRES_IN_SECONDS', { infer: true }),
    };
  }
}
