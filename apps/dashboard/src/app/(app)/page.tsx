import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { RoutePlaceholder } from '@/components/route-placeholder';
import { requireUser } from '@/server/auth';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  await requireUser();

  return (
    <PageShell>
      <PageHeader title="Dashboard" />
      <RoutePlaceholder route="dashboard" />
    </PageShell>
  );
}
