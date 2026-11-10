// [ANTES] import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
// [ANTES] import { Repository } from 'typeorm';
import { Brackets, Repository } from 'typeorm';
// [ANTES] import { Usuario } from './usuario.entity';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
// [ANTES] import { ListarUsuariosDto } from './dto/listar-usuarios.dto';
import {
  ListarUsuariosDto,
  type OrdenUsuarios,
} from './dto/listar-usuarios.dto';
// [ANTES] import { PaginaUsuariosDto } from './dto/pagina-usuarios.dto';
import { Pagina } from '../../common/dto/pagina';
import { isUniqueViolation } from '../../infrastructure/database/postgres-errors';
import { escaparLike } from '../../infrastructure/database/like';

/**
 * Columna de cada campo ordenable. Es una lista cerrada: lo que pide el
 * cliente se valida contra ella y nunca llega tal cual al SQL.
 */
const COLUMNA_DE_ORDEN = {
  nombre: 'usuario.nombre',
  creadoEn: 'usuario.creadoEn',
} as const;

/** `-creadoEn` → columna de `creadoEn`, descendente. */
function interpretarOrden(orden: OrdenUsuarios) {
  const descendente = orden.startsWith('-');
  const campo = (
    descendente ? orden.slice(1) : orden
  ) as keyof typeof COLUMNA_DE_ORDEN;
  return {
    columna: COLUMNA_DE_ORDEN[campo],
    direccion: descendente ? ('DESC' as const) : ('ASC' as const),
  };
}

/** Detalle del 412 cuando la versión enviada en If-Match ya no es la actual. */
export const MENSAJE_VERSION_DESACTUALIZADA =
  'El usuario cambió desde que lo leíste: vuelve a cargarlo y aplica tus cambios sobre la versión actual.';

/** Puntos, guiones y espacios: se ignoran al buscar por RUT. */
const SEPARADORES_RUT = /[.\-\s]/g;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  // [ANTES] findAll(): Promise<Usuario[]> {
  // [ANTES]   return this.usuarioRepository.find();
  // [ANTES] }
  /**
   * Una página de usuarios ordenados por nombre, opcionalmente filtrada.
   *
   * @remarks El nombre se compara sin tildes ni mayúsculas (`unaccent` +
   * `ILIKE`); el RUT, sin puntos ni guion. Los comodines del texto buscado se
   * escapan para que se busque literal. Por defecto se ordena por nombre.
   */
  async findAll({
    page,
    limit,
    buscar,
    orden = 'nombre',
    // [ANTES] }: ListarUsuariosDto): Promise<PaginaUsuariosDto> {
  }: ListarUsuariosDto): Promise<Pagina<Usuario>> {
    const { columna, direccion } = interpretarOrden(orden);
    const consulta = this.usuarioRepository
      .createQueryBuilder('usuario')
      // [ANTES] .orderBy('usuario.nombre', 'ASC')
      .orderBy(columna, direccion)
      // Desempate estable: la misma fila no salta entre páginas.
      .addOrderBy('usuario.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const texto = buscar?.trim();
    if (texto) {
      const rut = texto.replace(SEPARADORES_RUT, '').toUpperCase();
      consulta.where(
        new Brackets((condicion) => {
          condicion.where('unaccent(usuario.nombre) ILIKE unaccent(:nombre)', {
            nombre: `%${escaparLike(texto)}%`,
          });
          // Sin caracteres útiles (p. ej. buscar "."), no se filtra por RUT.
          if (rut) {
            condicion.orWhere("replace(usuario.rut, '-', '') ILIKE :rut", {
              rut: `%${escaparLike(rut)}%`,
            });
          }
        }),
      );
    }

    const [data, total] = await consulta.getManyAndCount();
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // [ANTES] async findOne(id: number): Promise<Usuario> {
  async findOne(id: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOneBy({ id });
    if (!usuario) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }
    return usuario;
  }

  create(dto: CreateUsuarioDto): Promise<Usuario> {
    const usuario = this.usuarioRepository.create(dto);
    // [ANTES] return this.usuarioRepository.save(usuario);
    return this.guardar(usuario);
  }

  // [ANTES] async update(id: number, dto: UpdateUsuarioDto): Promise<Usuario> {
  // [ANTES] async update(id: string, dto: UpdateUsuarioDto): Promise<Usuario> {
  // [ANTES]   const usuario = await this.findOne(id);
  // [ANTES]   Object.assign(usuario, dto);
  // [ANTES]   return this.guardar(usuario);
  // [ANTES] }
  /**
   * Actualiza un usuario. Con `versiones` (de `If-Match`), solo si su versión
   * actual es una de ellas.
   *
   * @remarks Concurrencia optimista: la versión se comprueba en el mismo
   * `UPDATE ... WHERE version IN (...)`, no antes. Así, de dos cambios
   * simultáneos sobre la misma versión, uno se aplica y el otro recibe 412.
   * TypeORM sube la versión y la fecha de cambio en ese mismo UPDATE.
   *
   * @throws NotFoundException si el usuario no existe.
   * @throws PreconditionFailedException si la versión ya no es la actual.
   * @throws ConflictException si el nuevo RUT ya pertenece a otro usuario.
   */
  async update(
    id: string,
    dto: UpdateUsuarioDto,
    versiones?: number[],
  ): Promise<Usuario> {
    await this.findOne(id);
    const cambios: Partial<Pick<Usuario, 'nombre' | 'rut'>> = {};
    if (dto.nombre !== undefined) {
      cambios.nombre = dto.nombre;
    }
    if (dto.rut !== undefined) {
      cambios.rut = dto.rut;
    }

    const consulta = this.usuarioRepository
      .createQueryBuilder()
      .update(Usuario)
      .set(cambios)
      .where('id = :id', { id });
    if (versiones) {
      if (versiones.length === 0) {
        throw new PreconditionFailedException(MENSAJE_VERSION_DESACTUALIZADA);
      }
      consulta.andWhere('version IN (:...versiones)', { versiones });
    }

    const { affected } = await this.conRutUnico(
      () => consulta.execute(),
      cambios.rut,
    );
    if (!affected) {
      // Ninguna fila: alguien guardó otra versión antes, o lo eliminó recién.
      throw versiones
        ? new PreconditionFailedException(MENSAJE_VERSION_DESACTUALIZADA)
        : new NotFoundException(`Usuario con id ${id} no encontrado`);
    }
    return this.findOne(id);
  }

  // [ANTES] async remove(id: number): Promise<void> {
  async remove(id: string): Promise<void> {
    const usuario = await this.findOne(id);
    await this.usuarioRepository.remove(usuario);
  }

  /**
   * Persiste el usuario, traduciendo un RUT duplicado a un `409 Conflict`.
   *
   * @throws ConflictException Si ya existe otro usuario con el mismo RUT.
   */
  private async guardar(usuario: Usuario): Promise<Usuario> {
    // [ANTES] try {
    // [ANTES]   return await this.usuarioRepository.save(usuario);
    // [ANTES] } catch (error) {
    // [ANTES]   if (isUniqueViolation(error)) {
    // [ANTES]     throw new ConflictException(
    // [ANTES]       `Ya existe un usuario con el RUT ${usuario.rut}`,
    // [ANTES]     );
    // [ANTES]   }
    // [ANTES]   throw error;
    // [ANTES] }
    return this.conRutUnico(
      () => this.usuarioRepository.save(usuario),
      usuario.rut,
    );
  }

  /** Ejecuta la operación traduciendo un RUT duplicado (UNIQUE) a `409`. */
  private async conRutUnico<T>(
    operacion: () => Promise<T>,
    rut: string | undefined,
  ): Promise<T> {
    try {
      return await operacion();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`Ya existe un usuario con el RUT ${rut}`);
      }
      throw error;
    }
  }
}
