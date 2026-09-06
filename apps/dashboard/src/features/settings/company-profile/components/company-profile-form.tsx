'use client';

import {
  Alert,
  AlertDescription,
  Button,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  Input,
  Separator,
  Spinner,
  toast,
} from '@inbox-triage/ui';
import { useState, useTransition } from 'react';
import { useFocusInvalidField } from '@/hooks/use-focus-invalid-field';
import { fieldErrorsFromZod } from '@/lib/validation/field-errors-from-zod';
import { saveCompanyProfileAction } from '../actions/save-company-profile.action';
import type { CompanyProfileDto } from '../dto/company-profile.dto';
import {
  companyProfileInputSchema,
  type CompanyProfileInput,
} from '../validation/company-profile-input.schema';

type CompanyProfileFormValues = Record<keyof CompanyProfileInput, string>;

type CompanyProfileField = keyof CompanyProfileInput;
type CompanyProfileFieldErrors = Partial<Record<CompanyProfileField, string>>;

type CompanyProfileFormProps = {
  profile: CompanyProfileDto;
};

type CompanyFieldProps = {
  disabled: boolean;
  error?: string;
  field: CompanyProfileField;
  label: string;
  onChange: (field: CompanyProfileField, value: string) => void;
  type?: 'email' | 'tel' | 'text';
  value: string;
};

const COMPANY_PROFILE_FIELDS = [
  'legalName',
  'taxId',
  'taxOffice',
  'address',
  'postalCode',
  'city',
  'phone',
  'email',
  'iban',
  'bankName',
] as const satisfies readonly CompanyProfileField[];

const SAVE_FAILURE_MESSAGE = 'Δεν ήταν δυνατή η αποθήκευση. Δοκιμάστε ξανά.';

function profileToFormValues(
  profile: CompanyProfileDto,
): CompanyProfileFormValues {
  return {
    legalName: profile.legalName ?? '',
    taxId: profile.taxId ?? '',
    taxOffice: profile.taxOffice ?? '',
    address: profile.address ?? '',
    postalCode: profile.postalCode ?? '',
    city: profile.city ?? '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
    iban: profile.iban ?? '',
    bankName: profile.bankName ?? '',
  };
}

function CompanyField({
  disabled,
  error,
  field,
  label,
  onChange,
  type = 'text',
  value,
}: CompanyFieldProps) {
  const errorId = `${field}-error`;

  return (
    <Field
      data-disabled={disabled || undefined}
      data-invalid={!!error || undefined}
    >
      <FieldLabel htmlFor={field}>{label}</FieldLabel>
      <Input
        id={field}
        name={field}
        type={type}
        value={value}
        disabled={disabled}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(field, event.target.value)}
      />
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </Field>
  );
}

export function CompanyProfileForm({ profile }: CompanyProfileFormProps) {
  const [values, setValues] = useState(() => profileToFormValues(profile));
  const [fieldErrors, setFieldErrors] = useState<CompanyProfileFieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { formRef, focusFirstInvalidField } = useFocusInvalidField({
    enabled: !isPending,
  });

  function handleChange(field: CompanyProfileField, value: string) {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    setFieldErrors((currentErrors) => {
      if (currentErrors[field] === undefined) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }

  function showValidationErrors(errors: CompanyProfileFieldErrors) {
    setFieldErrors(errors);
    focusFirstInvalidField();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);

    const parsed = companyProfileInputSchema.safeParse(values);
    if (!parsed.success) {
      showValidationErrors(
        fieldErrorsFromZod(parsed.error, COMPANY_PROFILE_FIELDS),
      );
      return;
    }

    startTransition(async () => {
      try {
        const result = await saveCompanyProfileAction(values);

        if (result.status === 'success') {
          setValues(profileToFormValues(result.data));
          setFieldErrors({});
          toast.add({ title: result.announcement, type: 'success' });
          return;
        }

        if (result.status === 'validation_error') {
          showValidationErrors(result.fieldErrors);
          return;
        }

        setSaveError(result.message);
      } catch {
        setSaveError(SAVE_FAILURE_MESSAGE);
      }
    });
  }

  return (
    <form ref={formRef} noValidate autoComplete="off" onSubmit={handleSubmit}>
      <FieldGroup>
        {saveError ? (
          <Alert variant="destructive">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        ) : null}

        <FieldSet>
          <FieldLegend>Στοιχεία επιχείρησης</FieldLegend>
          <FieldGroup className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <CompanyField
              field="legalName"
              label="Επωνυμία"
              value={values.legalName}
              error={fieldErrors.legalName}
              disabled={isPending}
              onChange={handleChange}
            />
            <CompanyField
              field="taxId"
              label="ΑΦΜ"
              value={values.taxId}
              error={fieldErrors.taxId}
              disabled={isPending}
              onChange={handleChange}
            />
            <CompanyField
              field="taxOffice"
              label="ΔΟΥ"
              value={values.taxOffice}
              error={fieldErrors.taxOffice}
              disabled={isPending}
              onChange={handleChange}
            />
          </FieldGroup>
        </FieldSet>

        <Separator />

        <FieldSet>
          <FieldLegend>Διεύθυνση και επικοινωνία</FieldLegend>
          <FieldGroup className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <CompanyField
              field="address"
              label="Διεύθυνση"
              value={values.address}
              error={fieldErrors.address}
              disabled={isPending}
              onChange={handleChange}
            />
            <CompanyField
              field="postalCode"
              label="ΤΚ"
              value={values.postalCode}
              error={fieldErrors.postalCode}
              disabled={isPending}
              onChange={handleChange}
            />
            <CompanyField
              field="city"
              label="Πόλη"
              value={values.city}
              error={fieldErrors.city}
              disabled={isPending}
              onChange={handleChange}
            />
            <CompanyField
              field="phone"
              label="Τηλέφωνο"
              value={values.phone}
              error={fieldErrors.phone}
              type="tel"
              disabled={isPending}
              onChange={handleChange}
            />
            <CompanyField
              field="email"
              label="Email"
              value={values.email}
              error={fieldErrors.email}
              type="email"
              disabled={isPending}
              onChange={handleChange}
            />
          </FieldGroup>
        </FieldSet>

        <Separator />

        <FieldSet>
          <FieldLegend>Τραπεζικά στοιχεία</FieldLegend>
          <FieldGroup className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <CompanyField
              field="iban"
              label="IBAN"
              value={values.iban}
              error={fieldErrors.iban}
              disabled={isPending}
              onChange={handleChange}
            />
            <CompanyField
              field="bankName"
              label="Τράπεζα"
              value={values.bankName}
              error={fieldErrors.bankName}
              disabled={isPending}
              onChange={handleChange}
            />
          </FieldGroup>
        </FieldSet>

        <div className="flex justify-stretch sm:justify-end">
          <Button
            className="w-full sm:w-auto"
            type="submit"
            disabled={isPending}
          >
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            Αποθήκευση
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
