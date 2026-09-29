import { Alert, AlertDescription } from '@inbox-triage/ui';

export function BriefReviewErrorAlert({ error }: { error: string }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
