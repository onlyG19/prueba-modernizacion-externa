import { PaginationMetaDto } from './pagination-meta.dto';

/**
 * Una página de resultados, del tipo que sea. La usan los servicios; hacia
 * afuera cada recurso expone su clase concreta (p. ej. `PaginaUsuariosDto`),
 * que Swagger sí puede describir.
 */
export interface Pagina<T> {
  data: T[];
  meta: PaginationMetaDto;
}
