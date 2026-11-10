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
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
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

  /** Lista todos los usuarios. */
  @Get()
  findAll(): Promise<Usuario[]> {
    return this.usuariosService.findAll();
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
    description: 'Datos inválidos',
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
    @Body() dto: UpdateUsuarioDto,
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
