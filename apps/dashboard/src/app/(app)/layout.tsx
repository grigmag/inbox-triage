import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  Toaster,
} from '@inbox-triage/ui';
import { AppSidebar } from '@/components/app-sidebar';
import { requireUser } from '@/server/auth';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  await requireUser();

  // TODO Desktop users can collapse the sidebar with its keyboard shortcut but
  // have no visible control to restore it. Consider keeping this shell header
  // visible at every viewport so SidebarTrigger remains discoverable.
  return (
    <Toaster>
      <SidebarProvider className="overflow-x-hidden">
        <a
          href="#main-content"
          className="bg-background text-foreground focus:ring-ring sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:ring-2 focus:outline-none"
        >
          Skip to main content
        </a>
        <AppSidebar />
        <SidebarInset
          id="main-content"
          tabIndex={-1}
          className="min-w-0 overflow-x-hidden outline-none"
        >
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
            <SidebarTrigger />
          </header>
          <div className="min-w-0 flex-1 overflow-x-hidden">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </Toaster>
  );
}
