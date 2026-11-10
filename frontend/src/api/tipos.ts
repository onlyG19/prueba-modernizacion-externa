/**
 * Tipos de la API, derivados del documento OpenAPI del backend.
 *
 * `esquema.d.ts` lo genera `pnpm gen:api` desde `/docs-json`: si la API cambia
 * y no se regeneran los tipos, el frontend deja de compilar en vez de fallar
 * en producción.
 */
import type { components } from './esquema';

type Esquemas = components['schemas'];

// [ANTES] export type Usuario = Esquemas['Usuario'];
export type Usuario = Esquemas['UsuarioDto'];
export type PaginaUsuarios = Esquemas['PaginaUsuariosDto'];
export type NuevoUsuario = Esquemas['CreateUsuarioDto'];
export type CambiosUsuario = Esquemas['UpdateUsuarioDto'];
export type Credenciales = Esquemas['LoginDto'];
export type TokenAcceso = Esquemas['AccessTokenDto'];
