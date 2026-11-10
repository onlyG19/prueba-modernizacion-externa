import type { Page } from '@playwright/test';
import { ADMIN, type Credenciales } from './fixtures';

/**
 * Completa y envía el formulario de login de la página actual.
 *
 * @remarks Cada envío cuenta para el límite de 10 logins por minuto: usarlo
 * solo donde el login es parte de lo que se prueba (ver `sesionDe`).
 */
export async function enviarLogin(
  pagina: Page,
  { usuario, clave }: Credenciales = ADMIN,
) {
  await pagina.getByLabel('Usuario').fill(usuario);
  await pagina.getByLabel('Contraseña').fill(clave);
  await pagina.getByRole('button', { name: 'Ingresar' }).click();
}

/** Desde cualquier página del panel: barra lateral → Usuarios → una pestaña. */
export async function abrirPestana(
  pagina: Page,
  pestana: 'Tabla de usuarios' | 'Registrar usuario',
) {
  await pagina
    .getByRole('navigation', { name: 'Panel' })
    .getByRole('link', { name: 'Usuarios' })
    .click();
  await pagina
    .getByRole('navigation', { name: 'Secciones de usuarios' })
    .getByRole('link', { name: pestana })
    .click();
}

/** Completa y envía el formulario de "Registrar usuario". */
export async function registrarUsuario(
  pagina: Page,
  nombre: string,
  rut: string,
) {
  await pagina.getByLabel('Nombre', { exact: true }).fill(nombre);
  await pagina.getByLabel('RUT', { exact: true }).pressSequentially(rut);
  await pagina.getByRole('button', { name: 'Registrar usuario' }).click();
}
