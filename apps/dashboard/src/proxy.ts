import { clerkMiddleware } from '@clerk/nextjs/server';
import { SIGN_IN_PATH } from '@inbox-triage/auth/routes';
import { isPublicPath } from './server/is-public-path';

// Next.js requires this convention file at the app boundary. Importing Clerk
// here is the documented exception; dashboard feature code must use
// `@inbox-triage/auth` or `src/server/auth.ts`.
export default clerkMiddleware(
  async (auth, request) => {
    if (!isPublicPath(request.nextUrl.pathname)) {
      await auth.protect();
    }
  },
  {
    signInUrl: SIGN_IN_PATH,
    signUpUrl: SIGN_IN_PATH,
  },
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    // Always run for Clerk-specific frontend API routes
    '/__clerk/(.*)',
  ],
};
