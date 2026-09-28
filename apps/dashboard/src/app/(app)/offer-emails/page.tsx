import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { EmailsInbox } from '@/features/emails/components/emails-inbox';
import { requireUser } from '@/server/auth';

export const metadata: Metadata = {
  title: 'Emails',
};

export default async function EmailsPage() {
  await requireUser();

  return (
    <PageShell width="full">
      <PageHeader title="Emails" />

      <EmailsInbox />
    </PageShell>
  );
}
