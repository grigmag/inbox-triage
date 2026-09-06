import { redirect } from 'next/navigation';
import { routes } from '@/config/routes';
import { requireUser } from '@/server/auth';

export default async function SettingsPage() {
  await requireUser();
  redirect(routes.settingsCompany);
}
