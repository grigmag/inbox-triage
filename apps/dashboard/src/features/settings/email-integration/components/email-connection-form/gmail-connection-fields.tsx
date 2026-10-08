import { ConnectionPasswordField } from './connection-password-field';
import type { ProviderConnectionFieldsProps } from './email-connection-form.types';

export function GmailConnectionFields({
  values,
  fieldErrors,
  disabled,
  hasSavedPassword,
  onChange,
}: ProviderConnectionFieldsProps) {
  return (
    <ConnectionPasswordField
      label="App password"
      value={values.password}
      error={fieldErrors.password}
      disabled={disabled}
      hasSavedPassword={hasSavedPassword}
      onChange={(value) => onChange('password', value)}
    >
      {hasSavedPassword
        ? 'App password saved. Enter a new app password to replace it. '
        : null}

      <span>
        Turn on 2-Step Verification for your Google account, then create an app
        password at{' '}
      </span>

      <a
        href="https://myaccount.google.com/apppasswords"
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        myaccount.google.com/apppasswords
      </a>

      <span>. Your normal Google password won&apos;t work.</span>
    </ConnectionPasswordField>
  );
}
