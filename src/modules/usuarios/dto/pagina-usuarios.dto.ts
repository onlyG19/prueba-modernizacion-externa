import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { Usuario } from '../entities/usuario.entity';

/**
 * Una página de usuarios. Es una clase concreta (no un genérico `Pagina<T>`)
 * para que Swagger y los tipos generados del frontend la describan completa.
 */
export class PaginaUsuariosDto {
  /** Usuarios de la página, ordenados por nombre. */
  // [ANTES] data: Usuario[];
  data!: Usuario[];

  // [ANTES] meta: PaginationMetaDto;
  meta!: PaginationMetaDto;
}
