import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { PageShell } from '@/components/page-shell';
import { CompanyProfileForm } from '@/features/settings/company-profile/components/company-profile-form';
import { companyProfileRepository } from '@/features/settings/company-profile/repositories/company-profile.repository';
import { SettingsNavigation } from '@/features/settings/components/settings-navigation';
import { requireUser } from '@/server/auth';

export const metadata: Metadata = {
  title: 'Company | Settings',
};

export default async function CompanySettingsPage() {
  await requireUser();
  const profile = await companyProfileRepository.get();

  return (
    <PageShell>
      <PageHeader title="Settings" />
      <SettingsNavigation activeDestination="company" />
      <CompanyProfileForm profile={profile} />
    </PageShell>
  );
}
