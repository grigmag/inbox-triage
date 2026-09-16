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
      name: 'Dashboard',
      href: '/',
      match: 'exact',
      pathname: '/',
      expected: true,
    },
    {
      name: 'Dashboard',
      href: '/',
      match: 'exact',
      pathname: '/clients',
      expected: false,
    },
    {
      name: 'Dashboard',
      href: '/',
      match: 'exact',
      pathname: '/?x',
      expected: false,
    },
    {
      name: 'Clients',
      href: '/clients',
      match: 'prefix',
      pathname: '/clients',
      expected: true,
    },
    {
      name: 'Clients',
      href: '/clients',
      match: 'prefix',
      pathname: '/clients/abc',
      expected: true,
    },
    {
      name: 'Clients',
      href: '/clients',
      match: 'prefix',
      pathname: '/clientship',
      expected: false,
    },
    {
      name: 'Clients',
      href: '/clients',
      match: 'prefix',
      pathname: '/',
      expected: false,
    },
    {
      name: 'New Inquiry',
      href: '/inquiries/new',
      match: 'prefix',
      pathname: '/inquiries/new',
      expected: true,
    },
    {
      name: 'New Inquiry',
      href: '/inquiries/new',
      match: 'prefix',
      pathname: '/inquiries/new/foo',
      expected: true,
    },
    {
      name: 'New Inquiry',
      href: '/inquiries/new',
      match: 'prefix',
      pathname: '/inquiries',
      expected: false,
    },
    {
      name: 'New Inquiry',
      href: '/inquiries/new',
      match: 'prefix',
      pathname: '/inquiries/123',
      expected: false,
    },
    {
      name: 'Delivery Timeline',
      href: '/timeline',
      match: 'prefix',
      pathname: '/timeline',
      expected: true,
    },
    {
      name: 'Delivery Timeline',
      href: '/timeline',
      match: 'prefix',
      pathname: '/timeline/1',
      expected: true,
    },
    {
      name: 'Delivery Timeline',
      href: '/timeline',
      match: 'prefix',
      pathname: '/timelines',
      expected: false,
    },
    {
      name: 'Agreements',
      href: '/agreements',
      match: 'prefix',
      pathname: '/agreements',
      expected: true,
    },
    {
      name: 'Agreements',
      href: '/agreements',
      match: 'prefix',
      pathname: '/agreements/1',
      expected: true,
    },
    {
      name: 'Agreements',
      href: '/agreements',
      match: 'prefix',
      pathname: '/agreement',
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
      pathname: '/settings/rates',
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
