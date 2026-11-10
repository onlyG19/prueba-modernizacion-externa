import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  // [ANTES] ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
// [ANTES] import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { ProblemDetailsDto } from '../../common/dto/problem-details.dto';
import { NonEmptyBodyPipe } from '../../common/pipes/non-empty-body.pipe';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ListarUsuariosDto } from './dto/listar-usuarios.dto';
import { PaginaUsuariosDto } from './dto/pagina-usuarios.dto';
import { UsuarioDto } from './dto/usuario.dto';
// [ANTES] import { Usuario } from './usuario.entity';
// [ANTES] import { Usuario } from './entities/usuario.entity';

/** El id de la ruta debe ser un UUID; si no, 400 con un mensaje claro. */
const ID_UUID = new ParseUUIDPipe({
  exceptionFactory: () =>
    new BadRequestException('El id del usuario debe ser un UUID'),
});

@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Falta el token de acceso, o es inválido o expiró',
  type: ProblemDetailsDto,
})
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // [ANTES] /** Lista todos los usuarios. */
  // [ANTES] @Get()
  // [ANTES] findAll(): Promise<Usuario[]> {
  // [ANTES]   return this.usuariosService.findAll();
  // [ANTES] }
  /** Lista los usuarios por páginas, ordenados por nombre, con búsqueda opcional. */
  @ApiBadRequestResponse({
    description: 'Parámetros de paginación o búsqueda inválidos',
    type: ProblemDetailsDto,
  })
  @Get()
  // [ANTES] findAll(@Query() query: ListarUsuariosDto): Promise<PaginaUsuariosDto> {
  // [ANTES]   return this.usuariosService.findAll(query);
  // [ANTES] }
  async findAll(@Query() query: ListarUsuariosDto): Promise<PaginaUsuariosDto> {
    const { data, meta } = await this.usuariosService.findAll(query);
    return { data: data.map((usuario) => UsuarioDto.desde(usuario)), meta };
  }

  /** Obtiene un usuario por su id. */
  @ApiNotFoundResponse({
    description: 'No existe un usuario con ese id',
    type: ProblemDetailsDto,
  })
  @Get(':id')
  // [ANTES] findOne(@Param('id', ParseIntPipe) id: number): Promise<Usuario> {
  // [ANTES]   return this.usuariosService.findOne(id);
  // [ANTES] }
  // [ANTES] async findOne(@Param('id', ParseIntPipe) id: number): Promise<UsuarioDto> {
  async findOne(@Param('id', ID_UUID) id: string): Promise<UsuarioDto> {
    return UsuarioDto.desde(await this.usuariosService.findOne(id));
  }

  /**
   * Crea un usuario. El RUT se acepta con o sin puntos y se guarda normalizado.
   */
  @ApiBadRequestResponse({
    description:
      'Datos inválidos (p. ej. RUT con dígito verificador incorrecto)',
    type: ProblemDetailsDto,
  })
  @ApiCreatedResponse({
    description: 'El usuario creado',
    type: UsuarioDto,
    headers: {
      Location: {
        description: 'Ruta del usuario creado (p. ej. /api/v1/usuarios/7)',
        schema: { type: 'string' },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Ya existe un usuario con ese RUT',
    type: ProblemDetailsDto,
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  // [ANTES] create(@Body() dto: CreateUsuarioDto): Promise<Usuario> {
  // [ANTES]   return this.usuariosService.create(dto);
  // [ANTES] }
  // [ANTES] async create(@Body() dto: CreateUsuarioDto): Promise<UsuarioDto> {
  // [ANTES]   return UsuarioDto.desde(await this.usuariosService.create(dto));
  // [ANTES] }
  async create(
    @Body() dto: CreateUsuarioDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UsuarioDto> {
    const creado = UsuarioDto.desde(await this.usuariosService.create(dto));
    // Estándar HTTP: un 201 dice dónde quedó el recurso. Se arma desde la ruta
    // de la petición, así no depende del prefijo ni de la versión de la API.
    res.location(
      `${req.originalUrl.split('?')[0].replace(/\/$/, '')}/${creado.id}`,
    );
    return creado;
  }

  /** Actualiza parcialmente un usuario. */
  @ApiBadRequestResponse({
    // [ANTES] description: 'Datos inválidos',
    description: 'Datos inválidos, o ningún campo que actualizar',
    type: ProblemDetailsDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe un usuario con ese id',
    type: ProblemDetailsDto,
  })
  @ApiConflictResponse({
    description: 'El nuevo RUT ya pertenece a otro usuario',
    type: ProblemDetailsDto,
  })
  @Patch(':id')
  // [ANTES] update(
  async update(
    // [ANTES] @Param('id', ParseIntPipe) id: number,
    @Param('id', ID_UUID) id: string,
    // [ANTES] @Body() dto: UpdateUsuarioDto,
    @Body(NonEmptyBodyPipe) dto: UpdateUsuarioDto,
    // [ANTES] ): Promise<Usuario> {
    // [ANTES]   return this.usuariosService.update(id, dto);
  ): Promise<UsuarioDto> {
    return UsuarioDto.desde(await this.usuariosService.update(id, dto));
  }

  /** Elimina un usuario. */
  @ApiNotFoundResponse({
    description: 'No existe un usuario con ese id',
    type: ProblemDetailsDto,
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  // [ANTES] remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
  remove(@Param('id', ID_UUID) id: string): Promise<void> {
    return this.usuariosService.remove(id);
  }
}
