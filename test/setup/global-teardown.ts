import { contenedoresGuardados } from './contenedores';

/** Después de todos los e2e: detiene y elimina los contenedores. */
export default async function globalTeardown(): Promise<void> {
  await Promise.all(contenedoresGuardados().map((c) => c.stop()));
}
