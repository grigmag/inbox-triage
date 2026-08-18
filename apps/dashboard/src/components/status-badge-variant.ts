import type { Badge } from '@inbox-triage/ui';
import type { ComponentProps } from 'react';

export type StatusBadgeTone =
  'neutral' | 'info' | 'warning' | 'success' | 'destructive';

type StatusBadgeVariant = NonNullable<ComponentProps<typeof Badge>['variant']>;

// TODO Add semantic badge variants or theme tokens so info, warning, and
// success have distinct treatments. The current shadcn variants do not provide
// separate semantic options for those tones.
const statusBadgeVariants = {
  neutral: 'secondary',
  info: 'default',
  warning: 'outline',
  success: 'default',
  destructive: 'destructive',
} as const satisfies Record<StatusBadgeTone, StatusBadgeVariant>;

export function statusBadgeVariant(tone: StatusBadgeTone) {
  return statusBadgeVariants[tone];
}
