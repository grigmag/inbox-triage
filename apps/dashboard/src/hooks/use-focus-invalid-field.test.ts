// @vitest-environment jsdom

import { act, createElement, StrictMode, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFocusInvalidField } from './use-focus-invalid-field';

type Control = {
  id: string;
  invalid?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  visibility?: 'hidden';
  tag?: 'input' | 'button' | 'div';
};

type HarnessProps = {
  enabled?: boolean;
  controls: Control[];
  onReady: (focus: () => void) => void;
};

function Harness({ enabled, controls, onReady }: HarnessProps) {
  const { formRef, focusFirstInvalidField } = useFocusInvalidField({ enabled });
  useEffect(
    () => onReady(focusFirstInvalidField),
    [onReady, focusFirstInvalidField],
  );
  return createElement(
    'form',
    { ref: formRef },
    controls.map(
      ({ id, invalid, disabled, hidden, visibility, tag = 'input' }) =>
        createElement(tag, {
          key: id,
          id,
          disabled,
          hidden,
          style: { visibility },
          'aria-invalid': invalid || undefined,
        }),
    ),
  );
}

describe('useFocusInvalidField', () => {
  let container: HTMLDivElement;
  let root: Root;
  let focusFirstInvalidField: () => void;
  const onReady = (focus: () => void) => {
    focusFirstInvalidField = focus;
  };
  const controls: Control[] = [
    { id: 'first', invalid: true },
    { id: 'second', invalid: true },
  ];

  async function render(props: Partial<HarnessProps> = {}) {
    await act(() => {
      root.render(
        createElement(
          StrictMode,
          null,
          createElement(Harness, {
            controls,
            onReady,
            ...props,
          }),
        ),
      );
    });
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    // jsdom has no layout. Supply boxes for visible elements only.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(
      function (this: HTMLElement) {
        return (this.hidden
          ? []
          : [new DOMRect(0, 0, 100, 20)]) as unknown as DOMRectList;
      },
    );
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(() => root.unmount());
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('focuses after error markup commits and stays within its form', async () => {
    const outside = document.createElement('input');
    outside.setAttribute('aria-invalid', 'true');
    document.body.prepend(outside);
    await render({ controls: [{ id: 'first' }] });
    expect(document.activeElement).toBe(document.body);

    await act(() => {
      root.render(
        createElement(
          StrictMode,
          null,
          createElement(Harness, { controls, onReady }),
        ),
      );
      focusFirstInvalidField();
      expect(document.activeElement).toBe(document.body);
    });

    expect(document.activeElement?.id).toBe('first');
    expect(document.activeElement?.getAttribute('aria-invalid')).toBe('true');
  });

  it('does not move focus when errors change without a focus call', async () => {
    await render();
    await act(() => focusFirstInvalidField());
    await render({ controls: [{ id: 'first' }, controls[1]!] });
    expect(document.activeElement?.id).toBe('first');
  });

  it('allows repeated submissions with unchanged errors, consuming each once', async () => {
    await render();
    const first = document.getElementById('first')!;
    const focus = vi.spyOn(first, 'focus');
    await act(() => focusFirstInvalidField());
    expect(focus).toHaveBeenCalledTimes(1);
    document.getElementById('second')!.focus();
    await act(() => focusFirstInvalidField());
    expect(focus).toHaveBeenCalledTimes(2);
    await render();
    expect(focus).toHaveBeenCalledTimes(2);
  });

  it('retains focus while disabled and applies it after controls are enabled', async () => {
    await render({
      enabled: false,
      controls: controls.map((control) => ({ ...control, disabled: true })),
    });
    await act(() => focusFirstInvalidField());
    expect(document.activeElement).toBe(document.body);
    await render({ enabled: true });
    expect(document.activeElement?.id).toBe('first');
    document.getElementById('second')!.focus();
    await render({ enabled: false });
    await render({ enabled: true });
    expect(document.activeElement?.id).toBe('second');
  });

  it('skips hidden, disabled and nonfocusable elements and supports trigger buttons', async () => {
    await render({
      controls: [
        { id: 'disabled', invalid: true, disabled: true },
        { id: 'hidden', invalid: true, hidden: true },
        { id: 'invisible', invalid: true, visibility: 'hidden' },
        { id: 'wrapper', invalid: true, tag: 'div' },
        { id: 'trigger', invalid: true, tag: 'button' },
        ...controls,
      ],
    });
    await act(() => focusFirstInvalidField());
    expect(document.activeElement?.id).toBe('trigger');
  });

  it('consumes a request with no eligible field', async () => {
    await render({ controls: [] });
    await act(() => focusFirstInvalidField());
    await render();
    expect(document.activeElement).toBe(document.body);
  });

  it('discards deferred focus on unmount', async () => {
    await render({ enabled: false });
    await act(() => focusFirstInvalidField());
    await act(() => root.render(null));
    await render();
    expect(document.activeElement).toBe(document.body);
  });
});
