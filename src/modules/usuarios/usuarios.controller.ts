import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
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
  ApiHeader,
  ApiOkResponse,
  ApiPreconditionFailedResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ProblemDetailsDto } from '../../common/dto/problem-details.dto';
import { NonEmptyBodyPipe } from '../../common/pipes/non-empty-body.pipe';
import { etagDeVersion, versionesDeIfMatch } from '../../common/http/etag';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ListarUsuariosDto } from './dto/listar-usuarios.dto';
import { PaginaUsuariosDto } from './dto/pagina-usuarios.dto';
import { UsuarioDto } from './dto/usuario.dto';

/** Cabecera ETag documentada en las respuestas con un usuario. */
const CABECERA_ETAG = {
  ETag: {
    description:
      'Versión del usuario (p. ej. "3"); se envía en If-Match al modificarlo',
    schema: { type: 'string' },
  },
};

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

  /** Lista los usuarios por páginas, con búsqueda y orden opcionales. */
  @ApiBadRequestResponse({
    description: 'Parámetros de paginación, búsqueda u orden inválidos',
    type: ProblemDetailsDto,
  })
  @Get()
  async findAll(@Query() query: ListarUsuariosDto): Promise<PaginaUsuariosDto> {
    const { data, meta } = await this.usuariosService.findAll(query);
    return { data: data.map((usuario) => UsuarioDto.desde(usuario)), meta };
  }

  /** Obtiene un usuario por su id. */
  @ApiNotFoundResponse({
    description: 'No existe un usuario con ese id',
    type: ProblemDetailsDto,
  })
  @ApiOkResponse({ type: UsuarioDto, headers: CABECERA_ETAG })
  @Get(':id')
  async findOne(
    @Param('id', ID_UUID) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UsuarioDto> {
    const usuario = UsuarioDto.desde(await this.usuariosService.findOne(id));
    // Con If-None-Match y el mismo ETag, Express responde 304 sin cuerpo.
    res.setHeader('ETag', etagDeVersion(usuario.version));
    return usuario;
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
      ...CABECERA_ETAG,
    },
  })
  @ApiConflictResponse({
    description: 'Ya existe un usuario con ese RUT',
    type: ProblemDetailsDto,
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
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
    res.setHeader('ETag', etagDeVersion(creado.version));
    return creado;
  }

  /**
   * Actualiza parcialmente un usuario. Con `If-Match: "<versión>"` el cambio
   * solo se aplica si nadie lo modificó entretanto (concurrencia optimista).
   */
  @ApiHeader({
    name: 'If-Match',
    required: false,
    description:
      'ETag de la versión sobre la que se hicieron los cambios (p. ej. "3"). Si ya no es la actual, responde 412 y no se pisa el cambio ajeno.',
  })
  @ApiOkResponse({ type: UsuarioDto, headers: CABECERA_ETAG })
  @ApiPreconditionFailedResponse({
    description: 'El usuario cambió desde la versión indicada en If-Match',
    type: ProblemDetailsDto,
  })
  @ApiBadRequestResponse({
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
  async update(
    @Param('id', ID_UUID) id: string,
    @Body(NonEmptyBodyPipe) dto: UpdateUsuarioDto,
    @Headers('if-match') ifMatch: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UsuarioDto> {
    const actualizado = UsuarioDto.desde(
      await this.usuariosService.update(id, dto, versionesDeIfMatch(ifMatch)),
    );
    res.setHeader('ETag', etagDeVersion(actualizado.version));
    return actualizado;
  }

  /** Elimina un usuario. */
  @ApiNotFoundResponse({
    description: 'No existe un usuario con ese id',
    type: ProblemDetailsDto,
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ID_UUID) id: string): Promise<void> {
    return this.usuariosService.remove(id);
  }
}
