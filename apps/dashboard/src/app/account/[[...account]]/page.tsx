import { UserProfile } from '@inbox-triage/auth/client';
import { HOME_PATH } from '@inbox-triage/auth/routes';
import Link from 'next/link';
import { requireUser } from '@/server/auth';

export default async function AccountPage() {
  await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex w-full px-6 py-4">
        {/* TODO Replace this page-level back link with a shared authenticated
            dashboard shell (home mark + UserButton) once more private routes exist. */}
        <Link
          href={HOME_PATH}
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to home
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center p-6">
        <UserProfile />
      </div>
    </div>
  );
}
