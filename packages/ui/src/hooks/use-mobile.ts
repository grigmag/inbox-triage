import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

// Relocated from the dashboard CLI destination (`apps/dashboard/src/hooks`)
// into the UI package so Sidebar does not import a dashboard-owned alias.
// Required monorepo compatibility deviation from generated shadcn source.
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return !!isMobile;
}
