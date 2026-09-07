import { Skeleton } from '@inbox-triage/ui';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { SettingsNavigation } from '@/features/settings/components/settings-navigation';

const sectionFieldCounts = [3, 5, 2] as const;

export default function CompanySettingsLoading() {
  return (
    <PageShell>
      <PageHeader title="Settings" />

      <SettingsNavigation activeDestination="company" />

      <div role="status">
        <span className="sr-only">Loading company settings.</span>

        <div aria-hidden className="flex flex-col gap-6">
          {sectionFieldCounts.map((fieldCount, sectionIndex) => (
            <div key={fieldCount} className="flex flex-col gap-4">
              <Skeleton className="h-5 w-48 max-w-full" />

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: fieldCount }, (_, fieldIndex) => (
                  <div
                    key={`${sectionIndex}-${fieldIndex}`}
                    className="flex flex-col gap-2"
                  >
                    <Skeleton className="h-4 w-24" />

                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>

              {sectionIndex < sectionFieldCounts.length - 1 ? (
                <Skeleton className="h-px w-full" />
              ) : null}
            </div>
          ))}

          <div className="flex justify-stretch sm:justify-end">
            <Skeleton className="h-8 w-full sm:w-28" />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
