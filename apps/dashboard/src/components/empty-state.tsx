import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@inbox-triage/ui';
import type { ReactNode } from 'react';

export type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
};

export function EmptyState({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  const hasActions = primaryAction != null || secondaryAction != null;

  return (
    <Empty>
      <EmptyHeader>
        {icon ? <EmptyMedia variant="icon">{icon}</EmptyMedia> : null}

        <EmptyTitle>{title}</EmptyTitle>

        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>

      {hasActions ? (
        <EmptyContent>
          {primaryAction}

          {secondaryAction}
        </EmptyContent>
      ) : null}
    </Empty>
  );
}
