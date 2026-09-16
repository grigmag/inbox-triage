import {
  CalendarClock,
  CirclePlus,
  FileText,
  LayoutDashboard,
  Mail,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';

export type RoutePlaceholderRoute =
  | 'dashboard'
  | 'clients'
  | 'new-inquiry'
  | 'delivery-timeline'
  | 'agreements'
  | 'emails';

type RoutePlaceholderCopy = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const routePlaceholders = {
  dashboard: {
    title: 'No dashboard data yet',
    description: 'Project activity and upcoming work will appear here.',
    icon: LayoutDashboard,
  },
  clients: {
    title: 'No clients yet',
    description: 'Client records and project history will be managed here.',
    icon: Users,
  },
  'new-inquiry': {
    title: 'Inquiry creation is coming next',
    description:
      'This page will guide staff from a client brief to a saved inquiry.',
    icon: CirclePlus,
  },
  'delivery-timeline': {
    title: 'No delivery timelines yet',
    description: 'Delivery milestones and due dates will be tracked here.',
    icon: CalendarClock,
  },
  agreements: {
    title: 'No agreements yet',
    description: 'Production agreements will be created and managed here.',
    icon: FileText,
  },
  emails: {
    title: 'Email browsing is coming next',
    description: 'Your connected inbox and email contents will appear here.',
    icon: Mail,
  },
} as const satisfies Record<RoutePlaceholderRoute, RoutePlaceholderCopy>;

export type RoutePlaceholderProps = {
  route: RoutePlaceholderRoute;
};

export function RoutePlaceholder({ route }: RoutePlaceholderProps) {
  const { title, description, icon: Icon } = routePlaceholders[route];

  return (
    <EmptyState
      title={title}
      description={description}
      icon={<Icon aria-hidden />}
    />
  );
}
