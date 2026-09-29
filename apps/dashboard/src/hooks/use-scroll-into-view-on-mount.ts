'use client';

import { useCallback, useRef } from 'react';
import { scrollIntoViewGently } from '@/lib/dom/scroll-into-view-gently';

/**
 * Scrolls the attached element into view. When it has not mounted yet, the
 * scroll happens once, as it mounts.
 */
export function useScrollIntoViewOnMount<T extends HTMLElement>() {
  const elementRef = useRef<T | null>(null);
  const scrollOnMountRef = useRef(false);

  const setNode = useCallback((node: T | null) => {
    elementRef.current = node;

    if (node && scrollOnMountRef.current) {
      scrollOnMountRef.current = false;
      scrollIntoViewGently(node);
    }
  }, []);

  function scrollIntoView() {
    if (elementRef.current) {
      scrollIntoViewGently(elementRef.current);
    } else {
      scrollOnMountRef.current = true;
    }
  }

  return { setNode, scrollIntoView };
}
