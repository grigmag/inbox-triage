import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { RoutePlaceholder } from '@/components/route-placeholder';
import { requireUser } from '@/server/auth';

export const metadata: Metadata = {
  title: 'Clients',
};

export default async function ClientsPage() {
  await requireUser();

  return (
    <PageShell>
      <PageHeader title="Clients" breadcrumbs={[{ label: 'Clients' }]} />

      <RoutePlaceholder route="clients" />
    </PageShell>
  );
}
