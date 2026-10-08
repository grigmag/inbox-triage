import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { SettingsNavigation } from '@/features/settings/components/settings-navigation';
import { EmailConnectionForm } from '@/features/settings/email-integration/components/email-connection-form/email-connection-form';
import { toEmailConnectionSettingsDto } from '@/features/settings/email-integration/dto/email-connection-settings.dto';
import { emailConnectionRepository } from '@/features/settings/email-integration/repositories/email-connection.repository';
import { requireUser } from '@/server/auth';

export const metadata: Metadata = {
  title: 'Email | Settings',
};

export default async function EmailSettingsPage() {
  const user = await requireUser();
  const connection = await emailConnectionRepository.findForUser(user.id);
  const connectionDto = connection
    ? toEmailConnectionSettingsDto(connection)
    : null;

  return (
    <PageShell>
      <PageHeader title="Settings" />

      <SettingsNavigation activeDestination="email" />

      <EmailConnectionForm connection={connectionDto} />
    </PageShell>
  );
}
