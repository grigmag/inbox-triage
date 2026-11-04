'use client';

import { UserButton } from '@inbox-triage/auth/client';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@inbox-triage/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isNavigationItemActive, navigationItems } from '@/config/navigation';
import { routes } from '@/config/routes';

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href={routes.home}
          className="flex items-center px-2 py-1.5 text-sm font-semibold text-sidebar-foreground"
          onClick={() => {
            setOpenMobile(false);
          }}
        >
          Inbox Triage
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navigationItems.map((item) => {
              const isActive = isNavigationItemActive(
                pathname,
                item.activePath ?? item.href,
                item.match,
              );
              const Icon = item.icon;

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive}
                    render={
                      <Link
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => {
                          setOpenMobile(false);
                        }}
                      />
                    }
                  >
                    <Icon aria-hidden />

                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <UserButton />
      </SidebarFooter>
    </Sidebar>
  );
}
