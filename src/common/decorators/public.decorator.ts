import { SetMetadata } from '@nestjs/common';

/** Clave de metadata que lee el `JwtAuthGuard` global. */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca un controller o un handler como público: el `JwtAuthGuard` global no
 * le exigirá token.
 *
 * @remarks
 * La API es privada por defecto ("secure by default"): un endpoint nuevo queda
 * protegido salvo que se marque explícitamente con `@Public()`.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
