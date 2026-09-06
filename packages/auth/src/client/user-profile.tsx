'use client';

import { UserProfile as ClerkUserProfile } from '@clerk/nextjs';
import type { ComponentProps } from 'react';
import { useAuthRoutes } from './auth-routes-context';

type UserProfileProps = Omit<
  ComponentProps<typeof ClerkUserProfile>,
  'path' | 'routing'
>;

export function UserProfile(props: UserProfileProps) {
  const { accountPath } = useAuthRoutes();

  return <ClerkUserProfile {...props} routing="path" path={accountPath} />;
}
