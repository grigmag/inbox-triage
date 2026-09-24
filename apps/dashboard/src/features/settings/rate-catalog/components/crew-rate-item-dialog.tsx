'use client';

import {
  Field,
  FieldError,
  FieldLabel,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@inbox-triage/ui';
import { useState } from 'react';
import type { FieldErrors } from '@/lib/actions/mutation-action-result';
import { createCrewRateItemAction } from '../actions/create-crew-rate-item.action';
import { editCrewRateItemAction } from '../actions/edit-crew-rate-item.action';
import type { CrewRateItemDto } from '../dto/crew-rate-item.dto';
import {
  crewRateItemInputSchema,
  type CrewRateItemField,
} from '../validation/crew-rate-item-input.schema';
import { formatCentsAsEuro } from '../validation/parse-euro-amount-to-cents';
import type { RateItemDialogProps } from './rate-item-dialog.types';
import { fieldErrorsFromZod } from '@/lib/validation/field-errors-from-zod';
import { useFocusInvalidField } from '@/hooks/use-focus-invalid-field';
import { ActiveField, RateItemDialogFrame } from './rate-item-dialog-frame';

type CrewFormValues = {
  name: string;
  dayRate: string;
  isActive: boolean;
};

export function CrewRateItemDialog({
  item,
  open,
  pending,
  onOpenChange,
  onSaved,
  runMutation,
}: RateItemDialogProps<CrewRateItemDto>) {
  const [values, setValues] = useState<CrewFormValues>(() =>
    item
      ? {
          name: item.name,
          dayRate: formatCentsAsEuro(item.dayRateCents),
          isActive: item.isActive,
        }
      : { name: '', dayRate: '', isActive: true },
  );
  const [fieldErrors, setFieldErrors] = useState<
    FieldErrors<CrewRateItemField>
  >({});
  const [failure, setFailure] = useState<string | null>(null);
  const { formRef, focusFirstInvalidField } = useFocusInvalidField({
    enabled: open && !pending,
  });

  function change<Field extends keyof CrewFormValues>(
    field: Field,
    value: CrewFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (current[field as CrewRateItemField] === undefined) return current;
      const next = { ...current };
      delete next[field as CrewRateItemField];
      return next;
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure(null);
    const parsed = crewRateItemInputSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      focusFirstInvalidField();
      return;
    }

    const result = await runMutation(() =>
      item
        ? editCrewRateItemAction(item.id, values)
        : createCrewRateItemAction(values),
    ).catch(() => null);
    if (result === null) {
      setFailure('Could not save changes. Try again.');
      return;
    }
    if (!result) return;
    if (result.status === 'success') {
      onSaved(result.data, result.announcement);
    } else if (result.status === 'validation_error') {
      setFieldErrors(result.fieldErrors);
      focusFirstInvalidField();
    } else if ('fieldErrors' in result && result.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      focusFirstInvalidField();
    } else {
      setFailure(result.message);
    }
  }

  return (
    <RateItemDialogFrame
      formRef={formRef}
      open={open}
      pending={pending}
      title={item ? 'Edit crew role' : 'Add crew role'}
      description={
        item
          ? 'Update this production role and its daily rate.'
          : 'Add a production role and its daily rate.'
      }
      submitLabel={item ? 'Save changes' : 'Add crew role'}
      failure={failure}
      onOpenChange={onOpenChange}
      onSubmit={(event) => void submit(event)}
    >
      <Field data-invalid={!!fieldErrors.name || undefined}>
        <FieldLabel htmlFor="rate-dialog-name">Role</FieldLabel>

        <Input
          id="rate-dialog-name"
          value={values.name}
          disabled={pending}
          aria-invalid={!!fieldErrors.name || undefined}
          aria-describedby={
            fieldErrors.name ? 'rate-dialog-name-error' : undefined
          }
          onChange={(event) => change('name', event.target.value)}
        />

        {fieldErrors.name ? (
          <FieldError id="rate-dialog-name-error">
            {fieldErrors.name}
          </FieldError>
        ) : null}
      </Field>

      <Field data-invalid={!!fieldErrors.dayRate || undefined}>
        <FieldLabel htmlFor="rate-dialog-dayRate">Day rate</FieldLabel>

        <InputGroup>
          <InputGroupAddon>€</InputGroupAddon>

          <InputGroupInput
            id="rate-dialog-dayRate"
            value={values.dayRate}
            inputMode="decimal"
            disabled={pending}
            aria-invalid={!!fieldErrors.dayRate || undefined}
            aria-describedby={
              fieldErrors.dayRate ? 'rate-dialog-dayRate-error' : undefined
            }
            onChange={(event) => change('dayRate', event.target.value)}
          />
        </InputGroup>

        {fieldErrors.dayRate ? (
          <FieldError id="rate-dialog-dayRate-error">
            {fieldErrors.dayRate}
          </FieldError>
        ) : null}
      </Field>

      <ActiveField
        checked={values.isActive}
        disabled={pending}
        onCheckedChange={(checked) => change('isActive', checked)}
      />
    </RateItemDialogFrame>
  );
}
