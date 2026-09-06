import { Button, Switch } from '@inbox-triage/ui';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

export type RateCatalogTableCallbacks<Item> = {
  pending: boolean;
  onActivation: (item: Item, isActive: boolean) => void;
  onEdit: (item: Item) => void;
  onMove: (index: number, direction: -1 | 1) => void;
};

export function CatalogActiveControl({
  item,
  disabled,
  onChange,
}: {
  item: { name: string; isActive: boolean };
  disabled: boolean;
  onChange: (isActive: boolean) => void;
}) {
  return (
    <Switch
      checked={item.isActive}
      disabled={disabled}
      aria-label={`${item.isActive ? 'Deactivate' : 'Activate'} ${item.name}`}
      aria-busy={disabled || undefined}
      onCheckedChange={onChange}
    />
  );
}

export function CatalogOrderingControls({
  name,
  index,
  length,
  disabled,
  onMove,
}: {
  name: string;
  index: number;
  length: number;
  disabled: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        aria-label={`Move ${name} up`}
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUpIcon />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        aria-label={`Move ${name} down`}
        disabled={disabled || index === length - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDownIcon />
      </Button>
    </div>
  );
}

export function CatalogEditButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
    >
      Edit
    </Button>
  );
}
