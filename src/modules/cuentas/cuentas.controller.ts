import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
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
import { ListarCuentasDto } from './dto/listar-cuentas.dto';
import { PaginaCuentasDto } from './dto/pagina-cuentas.dto';

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Falta el token de acceso, o es inválido o expiró',
  type: ProblemDetailsDto,
})
@ApiForbiddenResponse({
  description: 'La sesión no es la del administrador',
  type: ProblemDetailsDto,
})
// Ver y crear cuentas es solo para el administrador.
@UseGuards(SoloAdminGuard)
@Controller('cuentas')
export class CuentasController {
  constructor(private readonly cuentasService: CuentasService) {}

  /**
   * Lista las cuentas por páginas, con búsqueda por usuario y orden
   * opcionales. No incluye al administrador, que no vive en la base de datos.
   */
  @ApiBadRequestResponse({
    description: 'Parámetros de paginación, búsqueda u orden inválidos',
    type: ProblemDetailsDto,
  })
  @Get()
  async findAll(@Query() query: ListarCuentasDto): Promise<PaginaCuentasDto> {
    const { data, meta } = await this.cuentasService.findAll(query);
    return { data: data.map((cuenta) => CuentaDto.desde(cuenta)), meta };
  }

  /**
   * Crea una cuenta para ingresar a la consola, con rol `operador`.
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
