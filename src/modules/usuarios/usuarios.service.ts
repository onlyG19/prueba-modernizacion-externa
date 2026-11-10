// [ANTES] import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// [ANTES] import { Usuario } from './usuario.entity';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { isUniqueViolation } from '../../infrastructure/database/postgres-errors';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  findAll(): Promise<Usuario[]> {
    return this.usuarioRepository.find();
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
