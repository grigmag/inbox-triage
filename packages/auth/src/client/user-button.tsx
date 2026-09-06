'use client';

import { UserButton as ClerkUserButton } from '@clerk/nextjs';
import type { ComponentProps } from 'react';
import { useAuthRoutes } from './auth-routes-context';

type UserButtonProps = Omit<
  ComponentProps<typeof ClerkUserButton>,
  'userProfileMode' | 'userProfileUrl'
>;

export function UserButton(props: UserButtonProps) {
  const { accountPath } = useAuthRoutes();

  return (
    <ClerkUserButton
      {...props}
      userProfileMode="navigation"
      userProfileUrl={accountPath}
    />
  );
}
