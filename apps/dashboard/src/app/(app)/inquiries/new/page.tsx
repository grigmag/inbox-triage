import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { RoutePlaceholder } from '@/components/route-placeholder';
import { requireUser } from '@/server/auth';

export const metadata: Metadata = {
  title: 'New Inquiry',
};

export default async function NewInquiryPage() {
  await requireUser();

  return (
    <PageShell>
      <PageHeader
        title="New Inquiry"
        breadcrumbs={[{ label: 'New Inquiry' }]}
      />

      <RoutePlaceholder route="new-inquiry" />
    </PageShell>
  );
}
