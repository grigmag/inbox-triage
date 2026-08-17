'use client';

import { UserButton as ClerkUserButton } from '@clerk/nextjs';
import type { ComponentProps } from 'react';
import { ACCOUNT_PATH } from '../routes';

type UserButtonProps = Omit<
  ComponentProps<typeof ClerkUserButton>,
  'userProfileMode' | 'userProfileUrl'
>;

export function UserButton(props: UserButtonProps) {
  return (
    <ClerkUserButton
      {...props}
      userProfileMode="navigation"
      userProfileUrl={ACCOUNT_PATH}
    />
  );
}
