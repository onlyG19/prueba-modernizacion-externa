import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { CuentaDto } from './cuenta.dto';

/**
 * Una página de cuentas. Clase concreta, como `PaginaUsuariosDto`, para que
 * Swagger y los tipos generados del frontend la describan completa.
 */
export class PaginaCuentasDto {
  /** Cuentas de la página, en el orden pedido (por defecto, por usuario). */
  data!: CuentaDto[];

  meta!: PaginationMetaDto;
}
