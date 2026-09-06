'use client';

import { SignIn as ClerkSignIn } from '@clerk/nextjs';
import type { ComponentProps } from 'react';
import { useAuthRoutes } from './auth-routes-context';

type SignInProps = Omit<
  ComponentProps<typeof ClerkSignIn>,
  'fallbackRedirectUrl' | 'path' | 'routing' | 'signUpUrl' | 'withSignUp'
>;

export function SignIn(props: SignInProps) {
  const { defaultRedirectPath, signInPath } = useAuthRoutes();

  return (
    <ClerkSignIn
      {...props}
      routing="path"
      path={signInPath}
      fallbackRedirectUrl={defaultRedirectPath}
      // Clerk defaults this to /sign-up, which we do not have. Send those
      // navigations to /sign-in instead of a missing page.
      signUpUrl={signInPath}
      withSignUp={false}
    />
  );
}
