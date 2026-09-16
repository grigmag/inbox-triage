import { buttonVariants } from '@inbox-triage/ui';
import Link from 'next/link';
import { routes } from '@/config/routes';

export type SettingsDestination = 'company' | 'rates' | 'email';

export type SettingsNavigationProps = {
  activeDestination: SettingsDestination;
};

const settingsDestinations = [
  {
    id: 'company',
    label: 'Company',
    href: routes.settingsCompany,
  },
  {
    id: 'rates',
    label: 'Rates',
    href: routes.settingsRates,
  },
  {
    id: 'email',
    label: 'Email',
    href: routes.settingsEmail,
  },
] as const satisfies readonly {
  id: SettingsDestination;
  label: string;
  href: string;
}[];

export function SettingsNavigation({
  activeDestination,
}: SettingsNavigationProps) {
  return (
    <nav aria-label="Settings">
      <ul className="flex flex-wrap gap-1">
        {settingsDestinations.map((destination) => {
          const isActive = destination.id === activeDestination;

          return (
            <li key={destination.id}>
              <Link
                href={destination.href}
                aria-current={isActive ? 'page' : undefined}
                className={buttonVariants({
                  variant: isActive ? 'secondary' : 'ghost',
                  size: 'sm',
                })}
              >
                {destination.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
