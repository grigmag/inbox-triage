import type { ReactNode } from 'react';
import { Badge } from '@inbox-triage/ui';
import { CircleCheckIcon } from 'lucide-react';

/** A tinted badge with a check, for complete and sent states. */
export function SuccessBadge({ children }: { children: ReactNode }) {
  return (
    <Badge
      variant="outline"
      className="border-transparent bg-success/10 text-success dark:bg-success/20"
    >
      <CircleCheckIcon data-icon="inline-start" />

      {children}
    </Badge>
  );
}
