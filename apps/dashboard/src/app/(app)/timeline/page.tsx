import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { RoutePlaceholder } from '@/components/route-placeholder';
import { requireUser } from '@/server/auth';

export const metadata: Metadata = {
  title: 'Delivery Timeline',
};

export default async function DeliveryTimelinePage() {
  await requireUser();

  return (
    <PageShell>
      <PageHeader
        title="Delivery Timeline"
        breadcrumbs={[{ label: 'Delivery Timeline' }]}
      />

      <RoutePlaceholder route="delivery-timeline" />
    </PageShell>
  );
}
