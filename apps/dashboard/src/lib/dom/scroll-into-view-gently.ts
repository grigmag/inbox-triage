/** Scrolls smoothly, or instantly when the user prefers reduced motion. */
export function scrollIntoViewGently(
  element: HTMLElement,
  block: ScrollLogicalPosition = 'start',
) {
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  element.scrollIntoView({
    behavior: reduceMotion ? 'auto' : 'smooth',
    block,
  });
}
