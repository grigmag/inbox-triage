import type { LucideIcon } from 'lucide-react';
import {
  Mail,
  Settings,
  // CalendarClock,
  // CirclePlus,
  // FileText,
  // LayoutDashboard,
  // Users,
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
  // TODO Uncomment when the Dashboard page is ready.
  // {
  //   label: 'Dashboard',
  //   href: routes.home,
  //   icon: LayoutDashboard,
  //   match: 'exact',
  // },
  // TODO Uncomment when the Clients page is ready.
  // {
  //   label: 'Clients',
  //   href: routes.clients,
  //   icon: Users,
  //   match: 'prefix',
  // },
  // TODO Uncomment when the New Inquiry page is ready.
  // {
  //   label: 'New Inquiry',
  //   href: routes.newInquiry,
  //   icon: CirclePlus,
  //   match: 'prefix',
  // },
  // TODO Uncomment when the Delivery Timeline page is ready.
  // {
  //   label: 'Delivery Timeline',
  //   href: routes.deliveryTimeline,
  //   icon: CalendarClock,
  //   match: 'prefix',
  // },
  // TODO Uncomment when the Agreements page is ready.
  // {
  //   label: 'Agreements',
  //   href: routes.agreements,
  //   icon: FileText,
  //   match: 'prefix',
  // },
  {
    label: 'Offer emails',
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
