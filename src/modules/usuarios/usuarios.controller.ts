import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
// [ANTES] import { Usuario } from './usuario.entity';
import { Usuario } from './entities/usuario.entity';

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
  findAll(@Query() query: ListarUsuariosDto): Promise<PaginaUsuariosDto> {
    return this.usuariosService.findAll(query);
  }

  /** Obtiene un usuario por su id. */
  @ApiNotFoundResponse({
    description: 'No existe un usuario con ese id',
    type: ProblemDetailsDto,
  })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Usuario> {
    return this.usuariosService.findOne(id);
  }

  /**
   * Crea un usuario. El RUT se acepta con o sin puntos y se guarda normalizado.
   */
  @ApiBadRequestResponse({
    description:
      'Datos inválidos (p. ej. RUT con dígito verificador incorrecto)',
    type: ProblemDetailsDto,
  })
  @ApiConflictResponse({
    description: 'Ya existe un usuario con ese RUT',
    type: ProblemDetailsDto,
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUsuarioDto): Promise<Usuario> {
    return this.usuariosService.create(dto);
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
  update(
    @Param('id', ParseIntPipe) id: number,
    // [ANTES] @Body() dto: UpdateUsuarioDto,
    @Body(NonEmptyBodyPipe) dto: UpdateUsuarioDto,
  ): Promise<Usuario> {
    return this.usuariosService.update(id, dto);
  }

  /** Elimina un usuario. */
  @ApiNotFoundResponse({
    description: 'No existe un usuario con ese id',
    type: ProblemDetailsDto,
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.usuariosService.remove(id);
  }
}
