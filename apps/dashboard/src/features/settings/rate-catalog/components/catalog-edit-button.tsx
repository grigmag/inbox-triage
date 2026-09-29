import { Button } from '@inbox-triage/ui';

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
