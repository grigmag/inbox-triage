import { SIGN_IN_PATH } from '@inbox-triage/auth/routes';

const PUBLIC_PATH_PREFIXES = [SIGN_IN_PATH, '/__clerk'] as const;

export function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
