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
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  toast,
} from '@inbox-triage/ui';
import { useState, useTransition, type SubmitEvent } from 'react';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';
import { useFocusInvalidField } from '@/hooks/use-focus-invalid-field';
import { fieldErrorsFromZod } from '@/lib/validation/field-errors-from-zod';
import { saveEmailConnectionAction } from '@/features/settings/email-integration/actions/save-email-connection.action';
import { DisconnectEmailConnectionDialog } from '@/features/settings/email-integration/components/disconnect-email-connection-dialog';
import type { EmailConnectionSettingsDto } from '@/features/settings/email-integration/dto/email-connection-settings.dto';
import { getEmailConnectionSaveKind } from '@/features/settings/email-integration/lib/get-email-connection-save-kind';
import {
  emailConnectionInputSchema,
  passwordRequiredMessage,
  type EmailConnectionInput,
} from '@/features/settings/email-integration/validation/email-connection-input.schema';
import type {
  EmailConnectionField,
  EmailConnectionFieldErrors,
  EmailConnectionFormState,
  EmailConnectionFormValues,
  EmailProvider,
  ProviderConnectionFieldsProps,
} from './email-connection-form.types';
import { GmailConnectionFields } from './gmail-connection-fields';
import { ZohoConnectionFields } from './zoho-connection-fields';

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
const PROVIDER_LABELS: Record<EmailProvider, string> = {
  zoho: 'Zoho',
  gmail: 'Gmail',
};

const EMAIL_PLACEHOLDERS: Record<EmailProvider, string> = {
  zoho: 'you@yourstudio.com',
  gmail: 'you@gmail.com',
};

function initialState(
  connection: EmailConnectionSettingsDto | null,
): EmailConnectionFormState {
  const zoho = connection?.provider === 'zoho' ? connection : null;
  const emails: Record<EmailProvider, string> = { zoho: '', gmail: '' };

  if (connection) emails[connection.provider] = connection.username;

  return {
    provider: connection?.provider ?? 'zoho',
    emails,
    imapHost: zoho?.imapHost ?? 'imap.zoho.com',
    smtpHost: zoho?.smtpHost ?? 'smtp.zoho.com',
    password: '',
  };
}

export function EmailConnectionForm({ connection }: EmailConnectionFormProps) {
  const [state, setState] = useState(() => initialState(connection));
  const { emails, ...rest } = state;
  const values: EmailConnectionFormValues = {
    ...rest,
    email: emails[state.provider],
  };
  const [saved, setSaved] = useState(connection);
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false);
  // Kept after the dialog closes so its text doesn't change while it animates out.
  const [replacement, setReplacement] = useState<{
    input: EmailConnectionInput;
    current: EmailConnectionSettingsDto;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<EmailConnectionFieldErrors>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { formRef, focusFirstInvalidField } = useFocusInvalidField({
    enabled: !isPending,
  });
  const parsed = emailConnectionInputSchema.safeParse(values);
  const saveKind = parsed.success
    ? getEmailConnectionSaveKind(saved, parsed.data)
    : 'none';
  // Only an unchanged connection disables Save; invalid input shows its errors
  // on submit.
  const canSave = (saveKind !== 'none' || !parsed.success) && !isPending;
  const providerFieldsProps: ProviderConnectionFieldsProps = {
    values,
    fieldErrors,
    disabled: isPending,
    hasSavedPassword: saved?.provider === values.provider,
    onChange: handleChange,
  };

  function handleChange(field: EmailConnectionField, value: string) {
    setState((current) =>
      field === 'email'
        ? {
            ...current,
            emails: { ...current.emails, [current.provider]: value },
          }
        : { ...current, [field]: value },
    );
    setFormError(null);
    setFieldErrors((current) => {
      if (current[field] === undefined) return current;

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  // Passwords belong to one provider, so a switch clears the password. Each
  // provider keeps its own email draft, and the Zoho hosts are kept.
  function handleProviderChange(provider: EmailProvider) {
    setState((current) =>
      current.provider === provider
        ? current
        : { ...current, provider, password: '' },
    );
    setFormError(null);
    setFieldErrors({});
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

    // A new or replacing connection has no saved password to fall back on.
    if (
      (saveKind === 'create' || saveKind === 'replace') &&
      parsed.data.password === ''
    ) {
      showValidationErrors({
        password: passwordRequiredMessage(parsed.data.provider),
      });
      return;
    }

    if (saveKind === 'replace' && saved !== null) {
      setReplacement({ input: parsed.data, current: saved });
      setIsReplaceDialogOpen(true);
      return;
    }

    save(parsed.data);
  }

  function save(input: EmailConnectionInput) {
    startTransition(async () => {
      try {
        const result = await saveEmailConnectionAction(input);

        if (result.status === 'success') {
          setState((current) => ({
            ...current,
            ...(input.provider === 'zoho'
              ? { imapHost: input.imapHost, smtpHost: input.smtpHost }
              : null),
            provider: input.provider,
            emails: { ...current.emails, [input.provider]: input.email },
            password: '',
          }));
          setSaved(
            input.provider === 'zoho'
              ? {
                  provider: 'zoho',
                  username: input.email,
                  imapHost: input.imapHost,
                  smtpHost: input.smtpHost,
                }
              : { provider: 'gmail', username: input.email },
          );
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
    setState(initialState(null));
    setSaved(null);
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
            Save the mailbox used for incoming and outgoing email.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FieldGroup>
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            {saved ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <p className="min-w-0 text-sm">
                  {`Currently connected to ${PROVIDER_LABELS[saved.provider]}: `}

                  <span className="font-medium break-all">
                    {saved.username}
                  </span>
                </p>

                <DisconnectEmailConnectionDialog
                  providerLabel={PROVIDER_LABELS[saved.provider]}
                  username={saved.username}
                  disabled={isPending}
                  onDisconnected={handleDisconnected}
                  onFailure={setFormError}
                />
              </div>
            ) : null}

            <Field data-disabled={isPending || undefined}>
              <FieldLabel htmlFor="email-connection-provider">
                Provider
              </FieldLabel>

              <Select
                value={values.provider}
                disabled={isPending}
                onValueChange={(value) => {
                  if (value === 'zoho' || value === 'gmail')
                    handleProviderChange(value);
                }}
              >
                <SelectTrigger
                  id="email-connection-provider"
                  className="w-full"
                >
                  <SelectValue>{PROVIDER_LABELS[values.provider]}</SelectValue>
                </SelectTrigger>

                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="zoho">{PROVIDER_LABELS.zoho}</SelectItem>

                    <SelectItem value="gmail">
                      {PROVIDER_LABELS.gmail}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field data-invalid={!!fieldErrors.email || undefined}>
              <FieldLabel htmlFor="email-connection-email">Email</FieldLabel>

              <Input
                id="email-connection-email"
                name="email"
                type="email"
                value={values.email}
                placeholder={EMAIL_PLACEHOLDERS[values.provider]}
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

            {values.provider === 'gmail' ? (
              <GmailConnectionFields {...providerFieldsProps} />
            ) : (
              <ZohoConnectionFields {...providerFieldsProps} />
            )}
          </FieldGroup>
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" disabled={!canSave}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            Save
          </Button>
        </CardFooter>
      </Card>

      {replacement ? (
        <ConfirmActionDialog
          open={isReplaceDialogOpen}
          onOpenChange={setIsReplaceDialogOpen}
          title={`Switch to ${PROVIDER_LABELS[replacement.input.provider]}?`}
          description={`The ${PROVIDER_LABELS[replacement.input.provider]} connection replaces the current ${PROVIDER_LABELS[replacement.current.provider]} mailbox, ${replacement.current.username}. You can only have one email connection.`}
          actionLabel="Replace"
          cancelLabel="Cancel"
          onConfirm={() => save(replacement.input)}
        />
      ) : null}
    </form>
  );
}
