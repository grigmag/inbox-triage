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
  className?: string;
  disabled: boolean;
  error?: string;
  field: CompanyProfileField;
  label: string;
  onChange: (field: CompanyProfileField, value: string) => void;
  type?: 'email' | 'tel' | 'text';
  value: string;
};

const COMPANY_PROFILE_FIELDS = [
  'name',
  'address',
  'postalCode',
  'city',
  'phone',
  'email',
] as const satisfies readonly CompanyProfileField[];

const SAVE_FAILURE_MESSAGE =
  'Unable to save the company profile. Please try again.';

function profileToFormValues(
  profile: CompanyProfileDto,
): CompanyProfileFormValues {
  return {
    name: profile.name ?? '',
    address: profile.address ?? '',
    postalCode: profile.postalCode ?? '',
    city: profile.city ?? '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
  };
}

function CompanyField({
  className,
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
      className={className}
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
    <form
      className="w-full max-w-2xl"
      ref={formRef}
      noValidate
      autoComplete="off"
      onSubmit={handleSubmit}
    >
      <Card>
        <CardHeader>
          <CardTitle>Company profile</CardTitle>

          <CardDescription>
            Drafted email replies end with these details.
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-2">
          <FieldGroup className="grid grid-cols-1 sm:grid-cols-2">
            {saveError ? (
              <Alert variant="destructive" className="sm:col-span-2">
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            ) : null}

            <CompanyField
              className="sm:col-span-2"
              field="name"
              label="Company name"
              value={values.name}
              error={fieldErrors.name}
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

            <CompanyField
              field="phone"
              label="Phone"
              value={values.phone}
              error={fieldErrors.phone}
              type="tel"
              disabled={isPending}
              onChange={handleChange}
            />

            <CompanyField
              className="sm:col-span-2"
              field="address"
              label="Address"
              value={values.address}
              error={fieldErrors.address}
              disabled={isPending}
              onChange={handleChange}
            />

            <CompanyField
              field="postalCode"
              label="Postal code"
              value={values.postalCode}
              error={fieldErrors.postalCode}
              disabled={isPending}
              onChange={handleChange}
            />

            <CompanyField
              field="city"
              label="City"
              value={values.city}
              error={fieldErrors.city}
              disabled={isPending}
              onChange={handleChange}
            />
          </FieldGroup>
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            Save
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
