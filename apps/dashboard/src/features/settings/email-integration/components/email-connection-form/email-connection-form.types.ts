import type { EmailConnectionSettingsDto } from '@/features/settings/email-integration/dto/email-connection-settings.dto';

export type EmailProvider = EmailConnectionSettingsDto['provider'];

/**
 * The Zoho hosts stay in state while Gmail is chosen, so switching back
 * restores them. Parsing drops them for Gmail.
 */
export type EmailConnectionFormValues = {
  provider: EmailProvider;
  email: string;
  imapHost: string;
  smtpHost: string;
  password: string;
};

/**
 * Keeps one email draft per provider, so switching shows that provider's
 * address and switching back restores the previous one.
 */
export type EmailConnectionFormState = Omit<
  EmailConnectionFormValues,
  'email'
> & {
  emails: Record<EmailProvider, string>;
};

export type EmailConnectionField = Exclude<
  keyof EmailConnectionFormValues,
  'provider'
>;

export type EmailConnectionFieldErrors = Partial<
  Record<EmailConnectionField, string>
>;

/** Props shared by the provider-specific field sections. */
export type ProviderConnectionFieldsProps = {
  values: EmailConnectionFormValues;
  fieldErrors: EmailConnectionFieldErrors;
  disabled: boolean;
  /** The saved connection uses this provider, so its password can be kept. */
  hasSavedPassword: boolean;
  onChange: (field: EmailConnectionField, value: string) => void;
};
