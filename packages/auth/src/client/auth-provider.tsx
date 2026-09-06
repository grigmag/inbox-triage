'use client';

import { ClerkProvider } from '@clerk/nextjs';
import type { ComponentProps } from 'react';
import { AuthRoutesContext } from './auth-routes-context';
import { clerkAppearance } from './clerk-appearance';

type AuthProviderProps = Omit<
  ComponentProps<typeof ClerkProvider>,
  | 'afterSignOutUrl'
  | 'signInFallbackRedirectUrl'
  | 'signInUrl'
  | 'signUpFallbackRedirectUrl'
  | 'signUpUrl'
> & {
  accountPath: string;
  defaultRedirectPath: string;
  signInPath: string;
};

export function AuthProvider({
  accountPath,
  children,
  defaultRedirectPath,
  appearance,
  signInPath,
  ...props
}: AuthProviderProps) {
  return (
    <AuthRoutesContext.Provider
      value={{ accountPath, defaultRedirectPath, signInPath }}
    >
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
        signInUrl={signInPath}
        signUpUrl={signInPath}
        signInFallbackRedirectUrl={defaultRedirectPath}
        signUpFallbackRedirectUrl={defaultRedirectPath}
        afterSignOutUrl={signInPath}
      >
        {children}
      </ClerkProvider>
    </AuthRoutesContext.Provider>
  );
}
