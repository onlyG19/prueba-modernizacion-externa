/**
 * Tipos de la API, derivados del documento OpenAPI del backend.
 *
 * `esquema.d.ts` lo genera `pnpm gen:api` desde `/docs-json`: si la API cambia
 * y no se regeneran los tipos, el frontend deja de compilar en vez de fallar
 * en producción.
 */
// [ANTES] import type { components } from './esquema';
import type { components, operations } from './esquema';

type Esquemas = components['schemas'];

// [ANTES] export type Usuario = Esquemas['Usuario'];
export type Usuario = Esquemas['UsuarioDto'];
export type PaginaUsuarios = Esquemas['PaginaUsuariosDto'];
export type NuevoUsuario = Esquemas['CreateUsuarioDto'];
export type CambiosUsuario = Esquemas['UpdateUsuarioDto'];
export type Credenciales = Esquemas['LoginDto'];
export type TokenAcceso = Esquemas['AccessTokenDto'];
export type ConteoVisitas = Esquemas['VisitCountDto'];

type ParametrosListado = NonNullable<
  operations['UsuariosController_findAll_v1']['parameters']['query']
>;
/** Órdenes que acepta `GET /usuarios` (`nombre`, `-creadoEn`, …). */
export type OrdenUsuarios = NonNullable<ParametrosListado['orden']>;
