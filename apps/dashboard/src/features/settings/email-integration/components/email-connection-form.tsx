'use client';

import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Spinner,
  toast,
} from '@inbox-triage/ui';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState, useTransition, type SubmitEvent } from 'react';
import { useFocusInvalidField } from '@/hooks/use-focus-invalid-field';
import { fieldErrorsFromZod } from '@/lib/validation/field-errors-from-zod';
import { saveEmailConnectionAction } from '../actions/save-email-connection.action';
import { DisconnectEmailConnectionDialog } from './disconnect-email-connection-dialog';
import type { EmailConnectionSettingsDto } from '../dto/email-connection-settings.dto';
import { emailConnectionInputSchema } from '../validation/email-connection-input.schema';

type EmailConnectionFormValues = {
  email: string;
  imapHost: string;
  smtpHost: string;
  password: string;
};

type EmailConnectionField = keyof EmailConnectionFormValues;
type EmailConnectionFieldErrors = Partial<Record<EmailConnectionField, string>>;

type EmailConnectionFormProps = {
  connection: EmailConnectionSettingsDto | null;
};

const EMAIL_CONNECTION_FIELDS = [
  'email',
  'imapHost',
  'smtpHost',
  'password',
] as const;
const SAVE_FAILURE_MESSAGE =
  'Unable to save the email connection. Please try again.';

function initialValues(
  connection: EmailConnectionSettingsDto | null,
): EmailConnectionFormValues {
  return {
    email: connection?.username ?? '',
    imapHost: connection?.imapHost ?? 'imap.zoho.com',
    smtpHost: connection?.smtpHost ?? 'smtp.zoho.com',
    password: '',
  };
}

export function EmailConnectionForm({ connection }: EmailConnectionFormProps) {
  const [values, setValues] = useState(() => initialValues(connection));
  const [savedEmail, setSavedEmail] = useState<string | null>(
    connection?.username ?? null,
  );
  const [savedImapHost, setSavedImapHost] = useState(
    connection?.imapHost ?? null,
  );
  const [savedSmtpHost, setSavedSmtpHost] = useState(
    connection?.smtpHost ?? null,
  );
  const [hasConnection, setHasConnection] = useState(connection !== null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<EmailConnectionFieldErrors>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { formRef, focusFirstInvalidField } = useFocusInvalidField({
    enabled: !isPending,
  });
  const parsed = emailConnectionInputSchema.safeParse(values);
  const normalizedEmail = parsed.success ? parsed.data.email : null;
  const hasChanges = hasConnection
    ? normalizedEmail !== savedEmail ||
      (parsed.success ? parsed.data.imapHost : null) !== savedImapHost ||
      (parsed.success ? parsed.data.smtpHost : null) !== savedSmtpHost ||
      values.password !== ''
    : parsed.success && values.password !== '';
  const canSave = parsed.success && hasChanges && !isPending;

  function handleChange(field: EmailConnectionField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (field === 'password' && value === '') setIsPasswordVisible(false);
    setFormError(null);
    setFieldErrors((current) => {
      if (current[field] === undefined) return current;

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function showValidationErrors(errors: EmailConnectionFieldErrors) {
    setFieldErrors(errors);
    focusFirstInvalidField();
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!parsed.success) {
      showValidationErrors(
        fieldErrorsFromZod<EmailConnectionField>(
          parsed.error,
          EMAIL_CONNECTION_FIELDS,
        ),
      );
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveEmailConnectionAction(parsed.data);

        if (result.status === 'success') {
          setValues({
            email: parsed.data.email,
            imapHost: parsed.data.imapHost,
            smtpHost: parsed.data.smtpHost,
            password: '',
          });
          setSavedImapHost(parsed.data.imapHost);
          setSavedSmtpHost(parsed.data.smtpHost);
          setSavedEmail(parsed.data.email);
          setHasConnection(true);
          setIsPasswordVisible(false);
          setFieldErrors({});
          toast.add({ title: result.announcement, type: 'success' });
          return;
        }

        if (result.status === 'validation_error') {
          showValidationErrors(result.fieldErrors);
          return;
        }

        setFormError(result.message);
      } catch {
        setFormError(SAVE_FAILURE_MESSAGE);
      }
    });
  }

  function handleDisconnected(announcement: string) {
    setValues(initialValues(null));
    setSavedImapHost(null);
    setSavedSmtpHost(null);
    setSavedEmail(null);
    setHasConnection(false);
    setIsPasswordVisible(false);
    setFieldErrors({});
    setFormError(null);
    toast.add({ title: announcement, type: 'success' });
  }

  return (
    <form
      className="w-full max-w-2xl"
      ref={formRef}
      noValidate
      autoComplete="off"
      onSubmit={handleSubmit}
    >
      <Card>
        <CardHeader>
          <CardTitle>Email connection</CardTitle>

          <CardDescription>
            Save the Zoho mailbox used for incoming and outgoing email.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FieldGroup>
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <Field data-invalid={!!fieldErrors.email || undefined}>
              <FieldLabel htmlFor="email-connection-email">Email</FieldLabel>

              <Input
                id="email-connection-email"
                name="email"
                type="email"
                value={values.email}
                disabled={isPending}
                aria-invalid={!!fieldErrors.email || undefined}
                aria-describedby={
                  fieldErrors.email ? 'email-connection-email-error' : undefined
                }
                onChange={(event) => handleChange('email', event.target.value)}
              />

              {fieldErrors.email ? (
                <FieldError id="email-connection-email-error">
                  {fieldErrors.email}
                </FieldError>
              ) : null}
            </Field>

            <Field
              data-disabled={isPending || undefined}
              data-invalid={!!fieldErrors.imapHost || undefined}
            >
              <FieldLabel htmlFor="email-connection-imap-host">
                IMAP host
              </FieldLabel>

              <Input
                id="email-connection-imap-host"
                name="imapHost"
                type="text"
                value={values.imapHost}
                disabled={isPending}
                aria-invalid={!!fieldErrors.imapHost || undefined}
                aria-describedby={
                  fieldErrors.imapHost
                    ? 'email-connection-imap-host-help email-connection-imap-host-error'
                    : 'email-connection-imap-host-help'
                }
                onChange={(event) =>
                  handleChange('imapHost', event.target.value)
                }
              />

              {fieldErrors.imapHost ? (
                <FieldError id="email-connection-imap-host-error">
                  {fieldErrors.imapHost}
                </FieldError>
              ) : null}

              <FieldDescription id="email-connection-imap-host-help">
                <span>
                  In Zoho Mail, open Settings, Mail Accounts, your mailbox, then
                  Server Configuration Details. Copy the incoming IMAP server.
                  InboxTriage uses port 993 with TLS.{' '}
                </span>

                <a
                  href="https://www.zoho.com/mail/help/imap-access.html"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Zoho IMAP configuration guide
                </a>
              </FieldDescription>
            </Field>

            <Field
              data-disabled={isPending || undefined}
              data-invalid={!!fieldErrors.smtpHost || undefined}
            >
              <FieldLabel htmlFor="email-connection-smtp-host">
                SMTP host
              </FieldLabel>

              <Input
                id="email-connection-smtp-host"
                name="smtpHost"
                type="text"
                value={values.smtpHost}
                disabled={isPending}
                aria-invalid={!!fieldErrors.smtpHost || undefined}
                aria-describedby={
                  fieldErrors.smtpHost
                    ? 'email-connection-smtp-host-help email-connection-smtp-host-error'
                    : 'email-connection-smtp-host-help'
                }
                onChange={(event) =>
                  handleChange('smtpHost', event.target.value)
                }
              />

              {fieldErrors.smtpHost ? (
                <FieldError id="email-connection-smtp-host-error">
                  {fieldErrors.smtpHost}
                </FieldError>
              ) : null}

              <FieldDescription id="email-connection-smtp-host-help">
                <span>
                  Copy the outgoing SMTP server from the same Zoho Server
                  Configuration Details page. InboxTriage uses port 465 with
                  TLS.{' '}
                </span>

                <a
                  href="https://www.zoho.com/mail/help/zoho-smtp.html"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Zoho SMTP configuration guide
                </a>
              </FieldDescription>
            </Field>

            <Field
              data-disabled={isPending || undefined}
              data-invalid={!!fieldErrors.password || undefined}
            >
              <FieldLabel htmlFor="email-connection-password">
                Password
              </FieldLabel>

              <InputGroup>
                <InputGroupInput
                  id="email-connection-password"
                  name="password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={values.password}
                  placeholder={hasConnection ? '••••••••' : undefined}
                  disabled={isPending}
                  aria-invalid={!!fieldErrors.password || undefined}
                  aria-describedby={
                    fieldErrors.password
                      ? 'email-connection-password-help email-connection-password-error'
                      : 'email-connection-password-help'
                  }
                  onChange={(event) =>
                    handleChange('password', event.target.value)
                  }
                />

                {values.password !== '' ? (
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-xs"
                      disabled={isPending}
                      aria-label={
                        isPasswordVisible ? 'Hide password' : 'Show password'
                      }
                      aria-pressed={isPasswordVisible}
                      title={
                        isPasswordVisible ? 'Hide password' : 'Show password'
                      }
                      onClick={() =>
                        setIsPasswordVisible((visible) => !visible)
                      }
                    >
                      {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                    </InputGroupButton>
                  </InputGroupAddon>
                ) : null}
              </InputGroup>

              {fieldErrors.password ? (
                <FieldError id="email-connection-password-error">
                  {fieldErrors.password}
                </FieldError>
              ) : null}

              <FieldDescription id="email-connection-password-help">
                {hasConnection
                  ? 'Password saved. Enter a new password to replace it.'
                  : 'Use the password Zoho accepts for IMAP and SMTP.'}
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          {hasConnection ? (
            <DisconnectEmailConnectionDialog
              disabled={isPending}
              onDisconnected={handleDisconnected}
              onFailure={setFormError}
            />
          ) : null}

          <Button type="submit" disabled={!canSave}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            Save
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
