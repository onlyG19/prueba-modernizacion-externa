import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Deja pasar solo al administrador. Se aplica con `@UseGuards(SoloAdminGuard)`.
 *
 * @remarks Los guards de un controller corren siempre después de los globales:
 * cuando llega aquí, `JwtAuthGuard` ya verificó el token y dejó el usuario en
 * la request. Sin token la respuesta es 401 (no autenticado); con un token de
 * operador, 403 (autenticado, pero sin permiso).
 */
@Injectable()
export class SoloAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (user?.rol !== 'admin') {
      throw new ForbiddenException('Solo el administrador puede hacer esto');
    }
    return true;
  }
}
