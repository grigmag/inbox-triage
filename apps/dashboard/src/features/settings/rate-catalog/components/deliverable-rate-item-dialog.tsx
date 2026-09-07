'use client';

import {
  Field,
  FieldError,
  FieldLabel,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@inbox-triage/ui';
import { useState } from 'react';
import type { FieldErrors } from '@/lib/actions/action-result';
import { createDeliverableRateItemAction } from '../actions/create-deliverable-rate-item.action';
import { editDeliverableRateItemAction } from '../actions/edit-deliverable-rate-item.action';
import type { DeliverableRateItemDto } from '../dto/deliverable-rate-item.dto';
import {
  deliverableRateItemInputSchema,
  type DeliverableRateItemField,
} from '../validation/deliverable-rate-item-input.schema';
import { formatCentsAsEuro } from '../validation/parse-euro-amount-to-cents';
import { ActiveField, RateItemDialogFrame } from './rate-item-dialog-frame';
import type { RateItemDialogProps } from './rate-item-dialog.types';
import { fieldErrorsFromZod } from '@/lib/validation/field-errors-from-zod';
import { useFocusInvalidField } from '@/hooks/use-focus-invalid-field';

type DeliverableFormValues = {
  name: string;
  pricingMode: 'per_unit' | 'per_30';
  unitPrice: string;
  isActive: boolean;
};

export function DeliverableRateItemDialog({
  item,
  open,
  pending,
  onOpenChange,
  onSaved,
  runMutation,
}: RateItemDialogProps<DeliverableRateItemDto>) {
  const [values, setValues] = useState<DeliverableFormValues>(() =>
    item
      ? {
          name: item.name,
          pricingMode: item.pricingMode,
          unitPrice: formatCentsAsEuro(item.unitPriceCents),
          isActive: item.isActive,
        }
      : { name: '', pricingMode: 'per_unit', unitPrice: '', isActive: true },
  );
  const [fieldErrors, setFieldErrors] = useState<
    FieldErrors<DeliverableRateItemField>
  >({});
  const [failure, setFailure] = useState<string | null>(null);
  const { formRef, focusFirstInvalidField } = useFocusInvalidField({
    enabled: open && !pending,
  });

  function change<Field extends keyof DeliverableFormValues>(
    field: Field,
    value: DeliverableFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (current[field as DeliverableRateItemField] === undefined)
        return current;
      const next = { ...current };
      delete next[field as DeliverableRateItemField];
      return next;
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure(null);
    const parsed = deliverableRateItemInputSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      focusFirstInvalidField();
      return;
    }
    const result = await runMutation(() =>
      item
        ? editDeliverableRateItemAction(item.id, values)
        : createDeliverableRateItemAction(values),
    ).catch(() => null);
    if (result === null) {
      setFailure('Could not save changes. Try again.');
      return;
    }
    if (!result) return;
    if (result.status === 'success') onSaved(result.data, result.announcement);
    else if (result.status === 'validation_error') {
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
      title={item ? 'Edit deliverable' : 'Add deliverable'}
      description={
        item
          ? 'Update this deliverable and its pricing.'
          : 'Add a deliverable and choose how it is priced.'
      }
      submitLabel={item ? 'Save changes' : 'Add deliverable'}
      failure={failure}
      onOpenChange={onOpenChange}
      onSubmit={(event) => void submit(event)}
    >
      <Field data-invalid={!!fieldErrors.name || undefined}>
        <FieldLabel htmlFor="rate-dialog-name">Name</FieldLabel>

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

      <Field data-invalid={!!fieldErrors.pricingMode || undefined}>
        <FieldLabel htmlFor="rate-dialog-pricingMode">Pricing mode</FieldLabel>

        <Select
          value={values.pricingMode}
          disabled={pending}
          onValueChange={(value) => {
            if (value === 'per_unit' || value === 'per_30')
              change('pricingMode', value);
          }}
        >
          <SelectTrigger
            id="rate-dialog-pricingMode"
            className="w-full"
            aria-invalid={!!fieldErrors.pricingMode || undefined}
          >
            <SelectValue>
              {values.pricingMode === 'per_unit' ? 'Per unit' : 'Per 30'}
            </SelectValue>
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              <SelectItem value="per_unit">Per unit</SelectItem>

              <SelectItem value="per_30">Per 30</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        {fieldErrors.pricingMode ? (
          <FieldError>{fieldErrors.pricingMode}</FieldError>
        ) : null}
      </Field>

      <Field data-invalid={!!fieldErrors.unitPrice || undefined}>
        <FieldLabel htmlFor="rate-dialog-unitPrice">Unit price</FieldLabel>

        <InputGroup>
          <InputGroupAddon>€</InputGroupAddon>

          <InputGroupInput
            id="rate-dialog-unitPrice"
            value={values.unitPrice}
            inputMode="decimal"
            disabled={pending}
            aria-invalid={!!fieldErrors.unitPrice || undefined}
            aria-describedby={
              fieldErrors.unitPrice ? 'rate-dialog-unitPrice-error' : undefined
            }
            onChange={(event) => change('unitPrice', event.target.value)}
          />
        </InputGroup>

        {fieldErrors.unitPrice ? (
          <FieldError id="rate-dialog-unitPrice-error">
            {fieldErrors.unitPrice}
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
