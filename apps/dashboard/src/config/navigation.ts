import type { LucideIcon } from 'lucide-react';
import { Mail, Settings } from 'lucide-react';
import { routes } from './routes';

export type NavigationMatch = 'exact' | 'prefix';

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  match: NavigationMatch;
  activePath?: string;
};

export const navigationItems: readonly NavigationItem[] = [
  {
    label: 'Emails',
    href: routes.emails,
    icon: Mail,
    match: 'prefix',
  },
  {
    label: 'Settings',
    href: routes.settingsCompany,
    icon: Settings,
    match: 'prefix',
    activePath: routes.settings,
  },
];

export function isNavigationItemActive(
  pathname: string,
  href: string,
  match: NavigationMatch,
) {
  if (pathname === href) {
    return true;
  }

  if (match !== 'prefix') {
    return false;
  }

  const prefix = href.endsWith('/') ? href : `${href}/`;
  return pathname.startsWith(prefix);
}
