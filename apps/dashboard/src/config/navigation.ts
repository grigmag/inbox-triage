import type { LucideIcon } from 'lucide-react';
import {
  CalendarClock,
  CirclePlus,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';
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
    label: 'Dashboard',
    href: routes.home,
    icon: LayoutDashboard,
    match: 'exact',
  },
  {
    label: 'Clients',
    href: routes.clients,
    icon: Users,
    match: 'prefix',
  },
  {
    label: 'New Inquiry',
    href: routes.newInquiry,
    icon: CirclePlus,
    match: 'prefix',
  },
  {
    label: 'Delivery Timeline',
    href: routes.deliveryTimeline,
    icon: CalendarClock,
    match: 'prefix',
  },
  {
    label: 'Agreements',
    href: routes.agreements,
    icon: FileText,
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
