'use client';

import { createContext, useContext } from 'react';

export type AuthRoutes = {
  accountPath: string;
  defaultRedirectPath: string;
  signInPath: string;
};

export const AuthRoutesContext = createContext<AuthRoutes | null>(null);

export function useAuthRoutes(): AuthRoutes {
  const routes = useContext(AuthRoutesContext);

  if (!routes) {
    throw new Error('Auth components must be rendered within AuthProvider.');
  }

  return routes;
}
