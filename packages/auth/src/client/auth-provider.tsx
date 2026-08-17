'use client';

import { ClerkProvider } from '@clerk/nextjs';
import type { ComponentProps } from 'react';
import { clerkAppearance } from './clerk-appearance';
import { HOME_PATH, SIGN_IN_PATH } from '../routes';

type AuthProviderProps = Omit<
  ComponentProps<typeof ClerkProvider>,
  | 'afterSignOutUrl'
  | 'signInFallbackRedirectUrl'
  | 'signInUrl'
  | 'signUpFallbackRedirectUrl'
  | 'signUpUrl'
>;

export function AuthProvider({
  children,
  appearance,
  ...props
}: AuthProviderProps) {
  return (
    <ClerkProvider
      {...props}
      appearance={{
        ...clerkAppearance,
        ...appearance,
        variables: {
          ...clerkAppearance.variables,
          ...appearance?.variables,
        },
      }}
      signInUrl={SIGN_IN_PATH}
      signUpUrl={SIGN_IN_PATH}
      signInFallbackRedirectUrl={HOME_PATH}
      signUpFallbackRedirectUrl={HOME_PATH}
      afterSignOutUrl={SIGN_IN_PATH}
    >
      {children}
    </ClerkProvider>
  );
}
