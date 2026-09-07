import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { RoutePlaceholder } from '@/components/route-placeholder';
import { requireUser } from '@/server/auth';

export const metadata: Metadata = {
  title: 'Agreements',
};

export default async function AgreementsPage() {
  await requireUser();

  return (
    <PageShell>
      <PageHeader title="Agreements" breadcrumbs={[{ label: 'Agreements' }]} />

      <RoutePlaceholder route="agreements" />
    </PageShell>
  );
}
