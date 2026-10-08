import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
} from '@inbox-triage/ui';
import type { ReactNode } from 'react';

type ConnectionHostFieldProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  error: string | undefined;
  disabled: boolean;
  onChange: (value: string) => void;
  /** Help text shown below the input. */
  children: ReactNode;
};

export function ConnectionHostField({
  id,
  name,
  label,
  value,
  error,
  disabled,
  onChange,
  children,
}: ConnectionHostFieldProps) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;

  return (
    <Field
      data-disabled={disabled || undefined}
      data-invalid={!!error || undefined}
    >
      <FieldLabel htmlFor={id}>{label}</FieldLabel>

      <Input
        id={id}
        name={name}
        type="text"
        value={value}
        disabled={disabled}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${helpId} ${errorId}` : helpId}
        onChange={(event) => onChange(event.target.value)}
      />

      {error ? <FieldError id={errorId}>{error}</FieldError> : null}

      <FieldDescription id={helpId}>{children}</FieldDescription>
    </Field>
  );
}
