import { Field, FieldLabel, Switch } from '@inbox-triage/ui';

export function ActiveField({
  checked,
  disabled,
  onCheckedChange,
}: {
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Field orientation="horizontal" data-disabled={disabled || undefined}>
      <FieldLabel htmlFor="rate-dialog-isActive">Active</FieldLabel>

      <Switch
        id="rate-dialog-isActive"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </Field>
  );
}
