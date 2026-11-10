/**
 * Tipos de la API, derivados del documento OpenAPI del backend.
 *
 * `esquema.d.ts` lo genera `pnpm gen:api` desde `/docs-json`: si la API cambia
 * y no se regeneran los tipos, el frontend deja de compilar en vez de fallar
 * en producción.
 */
import type { components, operations } from './esquema';

type Esquemas = components['schemas'];

export type Usuario = Esquemas['UsuarioDto'];
export type PaginaUsuarios = Esquemas['PaginaUsuariosDto'];
export type NuevoUsuario = Esquemas['CreateUsuarioDto'];
export type CambiosUsuario = Esquemas['UpdateUsuarioDto'];
export type Credenciales = Esquemas['LoginDto'];
export type TokenAcceso = Esquemas['AccessTokenDto'];
/** `admin` (el del `.env`, que además crea cuentas) u `operador`. */
export type Rol = TokenAcceso['rol'];
export type Cuenta = Esquemas['CuentaDto'];
export type NuevaCuenta = Esquemas['CreateCuentaDto'];
export type ConteoVisitas = Esquemas['VisitCountDto'];

type ParametrosListado = NonNullable<
  operations['UsuariosController_findAll_v1']['parameters']['query']
>;
/** Órdenes que acepta `GET /usuarios` (`nombre`, `-creadoEn`, …). */
export type OrdenUsuarios = NonNullable<ParametrosListado['orden']>;
