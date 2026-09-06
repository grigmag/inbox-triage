type PostgresErrorWithCode = object & { code: string };

export function getPostgresErrorWithCode(
  error: unknown,
  code: string,
): PostgresErrorWithCode | undefined {
  const visited = new Set<object>();
  let current = error;

  while (typeof current === 'object' && current !== null) {
    if (visited.has(current)) return undefined;
    visited.add(current);

    if ('code' in current && current.code === code) {
      return current as PostgresErrorWithCode;
    }

    current = 'cause' in current ? current.cause : undefined;
  }

  return undefined;
}
