import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AccessTokenResponse, AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Intercambia usuario y contraseña por un token de acceso. Responde 200 y no
   * 201, porque no crea ningún recurso.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AccessTokenResponse> {
    return this.authService.login(dto);
  }
}
