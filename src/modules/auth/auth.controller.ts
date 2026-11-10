import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
// [ANTES] import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { ProblemDetailsDto } from '../../common/dto/problem-details.dto';
// [ANTES] import { AccessTokenResponse, AuthService } from './auth.service';
import { AuthService } from './auth.service';
import { AccessTokenDto } from './dto/access-token.dto';
import { LoginDto } from './dto/login.dto';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Intercambia usuario y contraseña por un token de acceso.
   *
   * @remarks Responde 200 y no 201, porque no crea ningún recurso.
   */
  @ApiOkResponse({ type: AccessTokenDto })
  @ApiBadRequestResponse({
    description: 'Falta el usuario o la contraseña',
    type: ProblemDetailsDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales inválidas',
    type: ProblemDetailsDto,
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // [ANTES] login(@Body() dto: LoginDto): Promise<AccessTokenResponse> {
  login(@Body() dto: LoginDto): Promise<AccessTokenDto> {
    return this.authService.login(dto);
  }
}
