'use client';

import {
  Field,
  FieldDescription,
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
import type { FieldErrors } from '@/lib/actions/mutation-action-result';
import { createAddonRateItemAction } from '../actions/create-addon-rate-item.action';
import { editAddonRateItemAction } from '../actions/edit-addon-rate-item.action';
import type { AddonRateItemDto } from '../dto/addon-rate-item.dto';
import {
  addonRateItemInputSchema,
  type AddonRateItemField,
} from '../validation/addon-rate-item-input.schema';
import { formatCentsAsEuro } from '../validation/parse-euro-amount-to-cents';
import { ActiveField, RateItemDialogFrame } from './rate-item-dialog-frame';
import type { RateItemDialogProps } from './rate-item-dialog.types';
import { fieldErrorsFromZod } from '@/lib/validation/field-errors-from-zod';
import { useFocusInvalidField } from '@/hooks/use-focus-invalid-field';

type AddonFormValues = {
  name: string;
  pricingMode: 'flat' | 'per_day' | 'percentage';
  price: string;
  percentage: string;
  isActive: boolean;
};

export function AddonRateItemDialog({
  item,
  open,
  pending,
  onOpenChange,
  onSaved,
  runMutation,
}: RateItemDialogProps<AddonRateItemDto>) {
  const [values, setValues] = useState<AddonFormValues>(() =>
    item
      ? {
          name: item.name,
          pricingMode: item.pricingMode,
          price:
            item.priceCents === null ? '' : formatCentsAsEuro(item.priceCents),
          percentage: item.percentage === null ? '' : String(item.percentage),
          isActive: item.isActive,
        }
      : {
          name: '',
          pricingMode: 'flat',
          price: '',
          percentage: '',
          isActive: true,
        },
  );
  const [fieldErrors, setFieldErrors] = useState<
    FieldErrors<AddonRateItemField>
  >({});
  const [failure, setFailure] = useState<string | null>(null);
  const [unitFamilyChanged, setUnitFamilyChanged] = useState(false);
  const { formRef, focusFirstInvalidField } = useFocusInvalidField({
    enabled: open && !pending,
  });

  function change<Field extends keyof AddonFormValues>(
    field: Field,
    value: AddonFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (current[field as AddonRateItemField] === undefined) return current;
      const next = { ...current };
      delete next[field as AddonRateItemField];
      return next;
    });
  }

  function changeMode(pricingMode: AddonFormValues['pricingMode']) {
    setValues((current) => {
      const wasPercentage = current.pricingMode === 'percentage';
      const isPercentage = pricingMode === 'percentage';
      if (wasPercentage === isPercentage) return { ...current, pricingMode };
      setUnitFamilyChanged(true);
      return { ...current, pricingMode, price: '', percentage: '' };
    });
    setFieldErrors((current) => ({
      ...current,
      pricingMode: undefined,
      price: undefined,
      percentage: undefined,
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure(null);
    const input =
      values.pricingMode === 'percentage'
        ? {
            name: values.name,
            pricingMode: values.pricingMode,
            percentage: values.percentage,
            isActive: values.isActive,
          }
        : {
            name: values.name,
            pricingMode: values.pricingMode,
            price: values.price,
            isActive: values.isActive,
          };
    const parsed = addonRateItemInputSchema.safeParse(input);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      focusFirstInvalidField();
      return;
    }
    const result = await runMutation(() =>
      item
        ? editAddonRateItemAction(item.id, input)
        : createAddonRateItemAction(input),
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

  const isPercentage = values.pricingMode === 'percentage';

  return (
    <RateItemDialogFrame
      formRef={formRef}
      open={open}
      pending={pending}
      title={item ? 'Edit add-on' : 'Add add-on'}
      description={
        item
          ? 'Update this extra service or surcharge and its pricing.'
          : 'Add an extra service or surcharge and choose how it is priced.'
      }
      submitLabel={item ? 'Save changes' : 'Add add-on'}
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
            if (
              value === 'flat' ||
              value === 'per_day' ||
              value === 'percentage'
            )
              changeMode(value);
          }}
        >
          <SelectTrigger
            id="rate-dialog-pricingMode"
            className="w-full"
            aria-invalid={!!fieldErrors.pricingMode || undefined}
          >
            <SelectValue>
              {values.pricingMode === 'flat'
                ? 'Flat'
                : values.pricingMode === 'per_day'
                  ? 'Per day'
                  : 'Percentage'}
            </SelectValue>
          </SelectTrigger>

          <SelectContent>
            <SelectGroup>
              <SelectItem value="flat">Flat</SelectItem>

              <SelectItem value="per_day">Per day</SelectItem>

              <SelectItem value="percentage">Percentage</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        {fieldErrors.pricingMode ? (
          <FieldError>{fieldErrors.pricingMode}</FieldError>
        ) : null}
      </Field>

      {unitFamilyChanged ? (
        <FieldDescription>
          Changing between a monetary amount and a percentage clears the current
          value. Enter a new value.
        </FieldDescription>
      ) : null}

      {isPercentage ? (
        <Field data-invalid={!!fieldErrors.percentage || undefined}>
          <FieldLabel htmlFor="rate-dialog-percentage">Percentage</FieldLabel>

          <InputGroup>
            <InputGroupInput
              id="rate-dialog-percentage"
              value={values.percentage}
              inputMode="numeric"
              disabled={pending}
              aria-invalid={!!fieldErrors.percentage || undefined}
              aria-describedby={
                fieldErrors.percentage
                  ? 'rate-dialog-percentage-error'
                  : undefined
              }
              onChange={(event) => change('percentage', event.target.value)}
            />

            <InputGroupAddon align="inline-end">%</InputGroupAddon>
          </InputGroup>

          {fieldErrors.percentage ? (
            <FieldError id="rate-dialog-percentage-error">
              {fieldErrors.percentage}
            </FieldError>
          ) : null}
        </Field>
      ) : (
        <Field data-invalid={!!fieldErrors.price || undefined}>
          <FieldLabel htmlFor="rate-dialog-price">Price</FieldLabel>

          <InputGroup>
            <InputGroupAddon>€</InputGroupAddon>

            <InputGroupInput
              id="rate-dialog-price"
              value={values.price}
              inputMode="decimal"
              disabled={pending}
              aria-invalid={!!fieldErrors.price || undefined}
              aria-describedby={
                fieldErrors.price ? 'rate-dialog-price-error' : undefined
              }
              onChange={(event) => change('price', event.target.value)}
            />
          </InputGroup>

          {fieldErrors.price ? (
            <FieldError id="rate-dialog-price-error">
              {fieldErrors.price}
            </FieldError>
          ) : null}
        </Field>
      )}

      <ActiveField
        checked={values.isActive}
        disabled={pending}
        onCheckedChange={(checked) => change('isActive', checked)}
      />
    </RateItemDialogFrame>
  );
}
