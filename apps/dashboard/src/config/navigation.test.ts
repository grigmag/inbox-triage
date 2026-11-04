import { describe, expect, it } from 'vitest';
import { isNavigationItemActive, type NavigationMatch } from './navigation';

type NavigationMatchCase = {
  name: string;
  href: string;
  match: NavigationMatch;
  pathname: string;
  expected: boolean;
};

describe('isNavigationItemActive', () => {
  it.each([
    {
      name: 'Home',
      href: '/',
      match: 'exact',
      pathname: '/',
      expected: true,
    },
    {
      name: 'Home',
      href: '/',
      match: 'exact',
      pathname: '/emails',
      expected: false,
    },
    {
      name: 'Home',
      href: '/',
      match: 'exact',
      pathname: '/?x',
      expected: false,
    },
    {
      name: 'Emails',
      href: '/emails',
      match: 'prefix',
      pathname: '/emails',
      expected: true,
    },
    {
      name: 'Emails',
      href: '/emails',
      match: 'prefix',
      pathname: '/emails/abc',
      expected: true,
    },
    {
      name: 'Emails',
      href: '/emails',
      match: 'prefix',
      pathname: '/emailsx',
      expected: false,
    },
    {
      name: 'Emails',
      href: '/emails',
      match: 'prefix',
      pathname: '/',
      expected: false,
    },
    {
      name: 'Email settings',
      href: '/settings/email',
      match: 'prefix',
      pathname: '/settings/email',
      expected: true,
    },
    {
      name: 'Email settings',
      href: '/settings/email',
      match: 'prefix',
      pathname: '/settings/email/foo',
      expected: true,
    },
    {
      name: 'Email settings',
      href: '/settings/email',
      match: 'prefix',
      pathname: '/settings',
      expected: false,
    },
    {
      name: 'Email settings',
      href: '/settings/email',
      match: 'prefix',
      pathname: '/settings/company',
      expected: false,
    },
    {
      name: 'Settings',
      href: '/settings',
      match: 'prefix',
      pathname: '/settings',
      expected: true,
    },
    {
      name: 'Settings',
      href: '/settings',
      match: 'prefix',
      pathname: '/settings/company',
      expected: true,
    },
    {
      name: 'Settings',
      href: '/settings',
      match: 'prefix',
      pathname: '/settings-profile',
      expected: false,
    },
    {
      name: 'Settings',
      href: '/settings',
      match: 'prefix',
      pathname: '/settings/email',
      expected: true,
    },
  ] satisfies readonly NavigationMatchCase[])(
    '$name ($match, $href) is $expected for $pathname',
    ({ href, match, pathname, expected }) => {
      expect(isNavigationItemActive(pathname, href, match)).toBe(expected);
    },
  );
});
