import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { formatReplyFooter } from '@/features/emails/brief-reply/reply-footer.utils';
import { EmailsInbox } from '@/features/emails/components/emails-inbox';
import { companyProfileRepository } from '@/features/settings/company-profile/repositories/company-profile.repository';
import { requireUser } from '@/server/auth';

export const metadata: Metadata = {
  title: 'Emails',
};

export default async function EmailsPage() {
  await requireUser();
  const profile = await companyProfileRepository.get();
  const replyFooter = formatReplyFooter(profile);

  return (
    <PageShell width="full">
      <PageHeader title="Emails" />

      <EmailsInbox replyFooter={replyFooter} />
    </PageShell>
  );
}
