import type { LucideIcon } from 'lucide-react';
import {
  CalendarClock,
  CirclePlus,
  FileText,
  LayoutDashboard,
  Users,
} from 'lucide-react';

export type NavigationMatch = 'exact' | 'prefix';

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  match: NavigationMatch;
};

export const navigationItems: readonly NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    match: 'exact',
  },
  {
    label: 'Clients',
    href: '/clients',
    icon: Users,
    match: 'prefix',
  },
  {
    label: 'New Inquiry',
    href: '/inquiries/new',
    icon: CirclePlus,
    match: 'prefix',
  },
  {
    label: 'Delivery Timeline',
    href: '/timeline',
    icon: CalendarClock,
    match: 'prefix',
  },
  {
    label: 'Agreements',
    href: '/agreements',
    icon: FileText,
    match: 'prefix',
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
