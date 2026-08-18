import { UserProfile } from '@inbox-triage/auth/client';
import type { Metadata } from 'next';
import { requireUser } from '@/server/auth';

export const metadata: Metadata = {
  title: 'Account',
};

export default async function AccountPage() {
  await requireUser();

  return (
    // TODO Consider using PageShell when the account experience includes
    // dashboard-owned content so its gutters and width remain consistent.
    <div className="flex flex-1 items-center justify-center p-6">
      <UserProfile />
    </div>
  );
}
