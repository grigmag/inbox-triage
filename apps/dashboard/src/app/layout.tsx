import { AuthProvider } from '@inbox-triage/auth/client';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '@inbox-triage/ui/globals.css';
import { routes } from '@/config/routes';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'InboxTriage',
    template: '%s | InboxTriage',
  },
  description: 'InboxTriage production studio workspace',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider
          accountPath={routes.account}
          defaultRedirectPath={routes.home}
          signInPath={routes.signIn}
        >
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
