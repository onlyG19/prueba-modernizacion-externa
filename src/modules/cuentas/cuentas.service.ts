import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pagina } from '../../common/dto/pagina';
import { hashPassword } from '../../common/security/password';
import { EnvironmentVariables } from '../../config/env.validation';
import { escaparLike } from '../../infrastructure/database/like';
import { interpretarOrden } from '../../infrastructure/database/orden';
import { isUniqueViolation } from '../../infrastructure/database/postgres-errors';
import { normalizarUsername } from './domain/credenciales';
import { CreateCuentaDto } from './dto/create-cuenta.dto';
import { ListarCuentasDto } from './dto/listar-cuentas.dto';
import { Cuenta } from './entities/cuenta.entity';

const usuarioOcupado = (username: string) =>
  new ConflictException(`El usuario ${username} ya está en uso`);

/** Columna de cada campo ordenable (lista cerrada, ver `interpretarOrden`). */
const COLUMNA_DE_ORDEN = {
  username: 'cuenta.username',
  creadoEn: 'cuenta.creadoEn',
} as const;

@Injectable()
export class CuentasService {
  constructor(
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  /**
   * Una página de cuentas, opcionalmente filtrada por parte del usuario. Por
   * defecto se ordena por usuario.
   *
   * @remarks Los usuarios se guardan en minúsculas: basta con pasar el texto
   * buscado a minúsculas. Sus comodines de LIKE se escapan para que se busque
   * literal.
   */
  async findAll({
    page,
    limit,
    buscar,
    orden = 'username',
  }: ListarCuentasDto): Promise<Pagina<Cuenta>> {
    const { columna, direccion } = interpretarOrden(orden, COLUMNA_DE_ORDEN);
    const consulta = this.cuentaRepository
      .createQueryBuilder('cuenta')
      .orderBy(columna, direccion)
      // Desempate estable: la misma fila no salta entre páginas.
      .addOrderBy('cuenta.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const texto = buscar ? normalizarUsername(buscar) : '';
    if (texto) {
      consulta.where('cuenta.username LIKE :texto', {
        texto: `%${escaparLike(texto)}%`,
      });
    }

    const [data, total] = await consulta.getManyAndCount();
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** La cuenta con ese usuario (sin distinguir mayúsculas), o `null`. */
  buscarPorUsername(username: string): Promise<Cuenta | null> {
    return this.cuentaRepository.findOneBy({
      username: normalizarUsername(username),
    });
  }

  /**
   * Crea una cuenta; de la contraseña solo se guarda su hash.
   *
   * @throws ConflictException Si el usuario ya existe, o es el del
   * administrador: dos cuentas con el mismo usuario serían ambiguas al
   * ingresar.
   */
  async create({ username, password }: CreateCuentaDto): Promise<Cuenta> {
    const admin = this.config.get('AUTH_USER', { infer: true });
    if (username === normalizarUsername(admin)) {
      throw usuarioOcupado(username);
    }

    const cuenta = this.cuentaRepository.create({
      username,
      passwordHash: await hashPassword(password),
    });
    try {
      return await this.cuentaRepository.save(cuenta);
    } catch (error) {
      // Lo resuelve el índice UNIQUE, no una consulta previa: así dos altas
      // simultáneas del mismo usuario no pueden pasar ambas.
      if (isUniqueViolation(error)) {
        throw usuarioOcupado(username);
      }
      throw error;
    }
  }
}
