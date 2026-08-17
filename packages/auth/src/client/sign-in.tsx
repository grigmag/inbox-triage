'use client';

import { SignIn as ClerkSignIn } from '@clerk/nextjs';
import type { ComponentProps } from 'react';
import { HOME_PATH, SIGN_IN_PATH } from '../routes';

type SignInProps = Omit<
  ComponentProps<typeof ClerkSignIn>,
  'fallbackRedirectUrl' | 'path' | 'routing' | 'signUpUrl' | 'withSignUp'
>;

export function SignIn(props: SignInProps) {
  return (
    <ClerkSignIn
      {...props}
      routing="path"
      path={SIGN_IN_PATH}
      fallbackRedirectUrl={HOME_PATH}
      // Clerk defaults this to /sign-up, which we do not have. Send those
      // navigations to /sign-in instead of a missing page.
      signUpUrl={SIGN_IN_PATH}
      withSignUp={false}
    />
  );
}
