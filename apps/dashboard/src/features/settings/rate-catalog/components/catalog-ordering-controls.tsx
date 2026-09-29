import { Button } from '@inbox-triage/ui';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

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
