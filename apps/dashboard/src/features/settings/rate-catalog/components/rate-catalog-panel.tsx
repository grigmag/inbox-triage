import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@inbox-triage/ui';
import { PlusIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/empty-state';

type RateCatalogPanelProps = {
  title: string;
  description: string;
  addLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  zeroActiveMessage: string;
  items: { isActive: boolean }[];
  disabled: boolean;
  onAdd: () => void;
  children: ReactNode;
};

export function RateCatalogPanel({
  title,
  description,
  addLabel,
  emptyTitle,
  emptyDescription,
  zeroActiveMessage,
  items,
  disabled,
  onAdd,
  children,
}: RateCatalogPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>

        <CardDescription>{description}</CardDescription>

        <CardAction>
          <Button size="sm" disabled={disabled} onClick={onAdd}>
            <PlusIcon data-icon="inline-start" />

            {addLabel}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <>
            {items.every((item) => !item.isActive) ? (
              <Alert className="mb-4">
                <AlertDescription>{zeroActiveMessage}</AlertDescription>
              </Alert>
            ) : null}

            {children}
          </>
        )}
      </CardContent>
    </Card>
  );
}
