import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { AuthenticatedRequest, JwtPayload } from './jwt-auth.guard';
import { SoloAdminGuard } from './solo-admin.guard';

/** Un ExecutionContext con el usuario que dejó `JwtAuthGuard` en la request. */
const contextoCon = (user?: JwtPayload) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }) as AuthenticatedRequest,
    }),
  }) as unknown as ExecutionContext;

describe('SoloAdminGuard', () => {
  const guard = new SoloAdminGuard();

  it('debe dejar pasar al administrador', () => {
    expect(guard.canActivate(contextoCon({ sub: 'admin', rol: 'admin' }))).toBe(
      true,
    );
  });

  it('debe responder 403 a un operador', () => {
    expect(() =>
      guard.canActivate(contextoCon({ sub: 'maria.lopez', rol: 'operador' })),
    ).toThrow(ForbiddenException);
  });

  it('debe responder 403 a un token sin rol (emitido antes de que existieran)', () => {
    expect(() =>
      guard.canActivate(contextoCon({ sub: 'admin' } as JwtPayload)),
    ).toThrow(ForbiddenException);
  });
});
