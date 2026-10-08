import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@inbox-triage/ui';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

type ConnectionPasswordFieldProps = {
  label: string;
  value: string;
  error: string | undefined;
  disabled: boolean;
  /** A password is already saved and is kept while the field stays empty. */
  hasSavedPassword: boolean;
  onChange: (value: string) => void;
  /** Help text shown below the input. */
  children: ReactNode;
};

export function ConnectionPasswordField({
  label,
  value,
  error,
  disabled,
  hasSavedPassword,
  onChange,
  children,
}: ConnectionPasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  // An emptied field, whether cleared, saved, or disconnected, starts hidden
  // again.
  if (value === '' && isVisible) setIsVisible(false);

  return (
    <Field
      data-disabled={disabled || undefined}
      data-invalid={!!error || undefined}
    >
      <FieldLabel htmlFor="email-connection-password">{label}</FieldLabel>

      <InputGroup>
        <InputGroupInput
          id="email-connection-password"
          name="password"
          type={isVisible ? 'text' : 'password'}
          value={value}
          placeholder={hasSavedPassword ? '••••••••' : undefined}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          aria-describedby={
            error
              ? 'email-connection-password-help email-connection-password-error'
              : 'email-connection-password-help'
          }
          onChange={(event) => onChange(event.target.value)}
        />

        {value !== '' ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              disabled={disabled}
              aria-label={isVisible ? 'Hide password' : 'Show password'}
              aria-pressed={isVisible}
              title={isVisible ? 'Hide password' : 'Show password'}
              onClick={() => setIsVisible((visible) => !visible)}
            >
              {isVisible ? <EyeOffIcon /> : <EyeIcon />}
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>

      {error ? (
        <FieldError id="email-connection-password-error">{error}</FieldError>
      ) : null}

      <FieldDescription id="email-connection-password-help">
        {children}
      </FieldDescription>
    </Field>
  );
}
