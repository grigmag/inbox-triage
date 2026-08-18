import { cn } from '@inbox-triage/ui';
import type { ReactNode } from 'react';

export type PageShellWidth = 'standard' | 'wide' | 'full';

export type PageShellProps = {
  children: ReactNode;
  width?: PageShellWidth;
};

const widthClassName = {
  standard: 'mx-auto max-w-[1200px]',
  wide: 'mx-auto max-w-[1600px]',
  full: 'max-w-none',
} as const;

export function PageShell({ children, width = 'standard' }: PageShellProps) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8',
        widthClassName[width],
      )}
    >
      {children}
    </div>
  );
}
