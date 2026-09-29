import type { ReactNode } from 'react';
import { Badge } from '@inbox-triage/ui';

/** A tinted badge for states that need attention but do not block. */
export function WarningBadge({ children }: { children: ReactNode }) {
  return (
    <Badge
      variant="outline"
      className="border-transparent bg-warning/10 text-warning dark:bg-warning/20"
    >
      {children}
    </Badge>
  );
}
