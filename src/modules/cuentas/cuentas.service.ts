import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPassword } from '../../common/security/password';
import { EnvironmentVariables } from '../../config/env.validation';
import { isUniqueViolation } from '../../infrastructure/database/postgres-errors';
import { normalizarUsername } from './domain/credenciales';
import { CreateCuentaDto } from './dto/create-cuenta.dto';
import { Cuenta } from './entities/cuenta.entity';

const usuarioOcupado = (username: string) =>
  new ConflictException(`El usuario ${username} ya está en uso`);

@Injectable()
export class CuentasService {
  constructor(
    @InjectRepository(Cuenta)
    private readonly cuentaRepository: Repository<Cuenta>,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

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
