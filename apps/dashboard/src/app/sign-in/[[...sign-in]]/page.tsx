import { SignIn } from '@inbox-triage/auth/client';

export default function SignInPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <SignIn />
    </div>
  );
}
