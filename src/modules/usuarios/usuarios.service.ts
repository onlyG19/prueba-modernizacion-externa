// [ANTES] import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ConflictException,
  Injectable,
  NotFoundException,
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

  async findOne(id: number): Promise<Usuario> {
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

  async update(id: number, dto: UpdateUsuarioDto): Promise<Usuario> {
    const usuario = await this.findOne(id);
    Object.assign(usuario, dto);
    // [ANTES] return this.usuarioRepository.save(usuario);
    return this.guardar(usuario);
  }

  async remove(id: number): Promise<void> {
    const usuario = await this.findOne(id);
    await this.usuarioRepository.remove(usuario);
  }

  /**
   * Persiste el usuario, traduciendo un RUT duplicado a un `409 Conflict`.
   *
   * @throws ConflictException Si ya existe otro usuario con el mismo RUT.
   */
  private async guardar(usuario: Usuario): Promise<Usuario> {
    try {
      return await this.usuarioRepository.save(usuario);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Ya existe un usuario con el RUT ${usuario.rut}`,
        );
      }
      throw error;
    }
  }
}
