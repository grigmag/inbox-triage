import { Card, CardContent, CardHeader, Skeleton } from '@inbox-triage/ui';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { SettingsNavigation } from '@/features/settings/components/settings-navigation';

export default function RatesSettingsLoading() {
  return (
    <PageShell>
      <PageHeader title="Settings" />
      <SettingsNavigation activeDestination="rates" />
      <div role="status">
        <span className="sr-only">Loading rates settings.</span>
        <div aria-hidden className="flex flex-col gap-2">
          <div className="flex gap-1">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
