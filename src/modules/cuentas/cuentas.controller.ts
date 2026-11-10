import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ProblemDetailsDto } from '../../common/dto/problem-details.dto';
import { SoloAdminGuard } from '../auth/solo-admin.guard';
import { CuentasService } from './cuentas.service';
import { CreateCuentaDto } from './dto/create-cuenta.dto';
import { CuentaDto } from './dto/cuenta.dto';

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Falta el token de acceso, o es inválido o expiró',
  type: ProblemDetailsDto,
})
@ApiForbiddenResponse({
  description: 'La sesión no es la del administrador',
  type: ProblemDetailsDto,
})
@UseGuards(SoloAdminGuard)
@Controller('cuentas')
export class CuentasController {
  constructor(private readonly cuentasService: CuentasService) {}

  /**
   * Crea una cuenta para ingresar a la consola, con rol `operador`. Solo el
   * administrador puede crear cuentas.
   */
  @ApiBadRequestResponse({
    description: 'Datos inválidos (p. ej. una contraseña demasiado corta)',
    type: ProblemDetailsDto,
  })
  @ApiCreatedResponse({ description: 'La cuenta creada', type: CuentaDto })
  @ApiConflictResponse({
    description: 'Ese usuario ya está en uso',
    type: ProblemDetailsDto,
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCuentaDto): Promise<CuentaDto> {
    return CuentaDto.desde(await this.cuentasService.create(dto));
  }
}
