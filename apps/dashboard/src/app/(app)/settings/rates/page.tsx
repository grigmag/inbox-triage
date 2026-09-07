import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { SettingsNavigation } from '@/features/settings/components/settings-navigation';
import { RateCatalogSettings } from '@/features/settings/rate-catalog/components/rate-catalog-settings';
import { rateCatalogRepository } from '@/features/settings/rate-catalog/repositories/rate-catalog.repository';
import { requireUser } from '@/server/auth';

export const metadata: Metadata = {
  title: 'Rates | Settings',
};

export default async function RatesSettingsPage() {
  await requireUser();
  const catalogs = await rateCatalogRepository.getAdminLists();

  return (
    <PageShell>
      <PageHeader title="Settings" />

      <SettingsNavigation activeDestination="rates" />

      {/* Key is used to remount when refreshed server data changes so local catalog state is reconciled. */}
      <RateCatalogSettings
        key={JSON.stringify(catalogs)}
        initialCatalogs={catalogs}
      />
    </PageShell>
  );
}
