import { routes } from '../config/routes';

const PUBLIC_PATH_PREFIXES = [routes.signIn, '/__clerk'] as const;

export function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
