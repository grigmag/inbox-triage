export const BILLING_GUARD = 'OPENROUTER_ALLOW_BILLABLE_REQUESTS';

export function allowsBillableRequests(value: string | undefined): boolean {
  return value === 'true';
}
