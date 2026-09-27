/** Detects AI SDK and fetch timeouts, including wrapped causes. */
export function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'TimeoutError' ||
      error.name === 'AbortError' ||
      isTimeoutError(error.cause))
  );
}
