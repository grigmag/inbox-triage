import { Switch } from '@inbox-triage/ui';

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
