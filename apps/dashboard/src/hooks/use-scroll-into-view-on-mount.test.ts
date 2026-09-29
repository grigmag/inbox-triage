// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollIntoViewOnMount } from '@/hooks/use-scroll-into-view-on-mount';

describe('useScrollIntoViewOnMount', () => {
  let container: HTMLDivElement;
  let root: Root;
  let scrollIntoView: () => void;
  const elementScroll = vi.fn();

  function Harness({ mounted }: { mounted: boolean }) {
    const scroll = useScrollIntoViewOnMount<HTMLDivElement>();
    scrollIntoView = scroll.scrollIntoView;
    return mounted ? createElement('div', { ref: scroll.setNode }) : null;
  }

  function render(mounted: boolean) {
    act(() => {
      root.render(createElement(Harness, { mounted }));
    });
  }

  beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    HTMLElement.prototype.scrollIntoView = elementScroll;
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    elementScroll.mockReset();
    vi.unstubAllGlobals();
  });

  it('scrolls a mounted element immediately', () => {
    render(true);
    scrollIntoView();

    expect(elementScroll).toHaveBeenCalledExactlyOnceWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('scrolls once the element mounts when requested before it exists', () => {
    render(false);
    scrollIntoView();

    expect(elementScroll).not.toHaveBeenCalled();

    render(true);

    expect(elementScroll).toHaveBeenCalledOnce();
  });

  it('does not scroll again when the element remounts', () => {
    render(false);
    scrollIntoView();
    render(true);
    render(false);
    render(true);

    expect(elementScroll).toHaveBeenCalledOnce();
  });

  it('scrolls instantly when the user prefers reduced motion', () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
    } as MediaQueryList);
    render(true);
    scrollIntoView();

    expect(elementScroll).toHaveBeenCalledWith({
      behavior: 'auto',
      block: 'start',
    });
  });
});
