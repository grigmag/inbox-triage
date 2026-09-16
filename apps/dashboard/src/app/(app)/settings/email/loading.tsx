import { Card, CardContent, CardHeader, Skeleton } from '@inbox-triage/ui';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { SettingsNavigation } from '@/features/settings/components/settings-navigation';

export default function EmailSettingsLoading() {
  return (
    <PageShell>
      <PageHeader title="Settings" />

      <SettingsNavigation activeDestination="email" />

      <div className="w-full max-w-2xl" role="status">
        <span className="sr-only">Loading email settings.</span>

        <div aria-hidden>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />

              <Skeleton className="h-4 w-72 max-w-full" />
            </CardHeader>

            <CardContent className="flex flex-col gap-5">
              <Skeleton className="h-4 w-24" />

              <Skeleton className="h-8 w-full" />

              <Skeleton className="h-4 w-24" />

              <Skeleton className="h-8 w-full" />

              <div className="flex justify-end gap-2">
                <Skeleton className="h-8 w-24" />

                <Skeleton className="h-8 w-28" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
