import { Badge } from '@inbox-triage/ui';
import type { ReactNode } from 'react';
import {
  statusBadgeVariant,
  type StatusBadgeTone,
} from '@/components/status-badge-variant';

export type { StatusBadgeTone } from '@/components/status-badge-variant';

export type StatusBadgeProps = {
  tone: StatusBadgeTone;
  children: ReactNode;
};

export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return <Badge variant={statusBadgeVariant(tone)}>{children}</Badge>;
}
