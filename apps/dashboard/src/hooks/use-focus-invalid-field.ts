'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type UseFocusInvalidFieldOptions = {
  /** Defer scheduled focus while false. Defaults to true. */
  enabled?: boolean;
};

function focusFirstInvalidControl(form: HTMLFormElement) {
  for (const control of form.querySelectorAll<HTMLElement>(
    '[aria-invalid="true"]',
  )) {
    if (
      control.matches(':disabled, [aria-disabled="true"]') ||
      control.closest('[hidden], [inert]') ||
      control.getClientRects().length === 0 ||
      getComputedStyle(control).visibility !== 'visible'
    ) {
      continue;
    }

    control.focus();
    if (form.ownerDocument.activeElement === control) break;
  }
}

/** Focuses invalid controls in DOM order within the attached form. */
export function useFocusInvalidField({
  enabled = true,
}: UseFocusInvalidFieldOptions = {}) {
  const formRef = useRef<HTMLFormElement>(null);
  // Incrementing the ID schedules focus after render, even when errors are unchanged.
  // Tracking the handled ID lets requests wait until enabled without replaying them.
  const [requestId, setRequestId] = useState(0);
  const handledRequestId = useRef(0);

  /** Schedule focus after rendering errors, waiting until enabled. */
  const focusFirstInvalidField = useCallback(() => {
    setRequestId((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!enabled || requestId === handledRequestId.current) return;
    handledRequestId.current = requestId;

    if (formRef.current) {
      focusFirstInvalidControl(formRef.current);
    }
  }, [enabled, requestId]);

  return { formRef, focusFirstInvalidField };
}
