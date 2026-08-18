import { Skeleton } from '@inbox-triage/ui';

export function PageLoadingSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="min-h-64 w-full rounded-xl" />
    </div>
  );
}
