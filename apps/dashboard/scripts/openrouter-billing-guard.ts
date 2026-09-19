export const BILLING_GUARD = 'OPENROUTER_ALLOW_BILLABLE_SMOKE_TEST';

export function allowsBillableSmokeTest(value: string | undefined): boolean {
  return value === 'true';
}
