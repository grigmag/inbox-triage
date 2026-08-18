import { describe, expect, it } from 'vitest';
import { isPublicPath } from './is-public-path';

describe('isPublicPath', () => {
  it('allows the sign-in route and its catch-all segments', () => {
    expect(isPublicPath('/sign-in')).toBe(true);
    expect(isPublicPath('/sign-in/sso-callback')).toBe(true);
  });

  it('allows Clerk frontend and internal paths', () => {
    expect(isPublicPath('/__clerk')).toBe(true);
    expect(isPublicPath('/__clerk/handshake')).toBe(true);
  });

  it.each([
    '/',
    '/clients',
    '/inquiries/new',
    '/timeline',
    '/agreements',
    '/account',
    '/sign-in-elsewhere',
  ])('treats %s as private', (pathname) => {
    expect(isPublicPath(pathname)).toBe(false);
  });
});
