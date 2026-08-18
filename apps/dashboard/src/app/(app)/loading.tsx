import { PageLoadingSkeleton } from '@/components/page-loading-skeleton';
import { PageShell } from '@/components/page-shell';

export default function Loading() {
  return (
    <PageShell>
      <PageLoadingSkeleton />
    </PageShell>
  );
}
