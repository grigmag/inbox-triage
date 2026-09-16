import Link from 'next/link';
import { Alert, AlertDescription, Button } from '@inbox-triage/ui';
import { routes } from '@/config/routes';

// TODO consider reusing InlineError component
export function EmailFailure({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>

      <div className="flex gap-2">
        <Button variant="outline" onClick={retry}>
          Retry
        </Button>

        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={routes.settingsEmail} />}
        >
          Email settings
        </Button>
      </div>
    </Alert>
  );
}
