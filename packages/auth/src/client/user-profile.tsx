'use client';

import { UserProfile as ClerkUserProfile } from '@clerk/nextjs';
import type { ComponentProps } from 'react';
import { ACCOUNT_PATH } from '../routes';

type UserProfileProps = Omit<
  ComponentProps<typeof ClerkUserProfile>,
  'path' | 'routing'
>;

export function UserProfile(props: UserProfileProps) {
  return <ClerkUserProfile {...props} routing="path" path={ACCOUNT_PATH} />;
}
