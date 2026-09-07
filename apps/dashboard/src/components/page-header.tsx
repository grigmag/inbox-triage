import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@inbox-triage/ui';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

export type PageHeaderBreadcrumbItem = {
  label: string;
  href?: string;
};

export type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs?: readonly PageHeaderBreadcrumbItem[];
  action?: ReactNode;
};

export function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              const href = item.href;

              return (
                <Fragment key={`${item.label}-${index}`}>
                  {index > 0 ? <BreadcrumbSeparator /> : null}

                  <BreadcrumbItem>
                    {isLast || href === undefined ? (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<Link href={href} />}>
                        {item.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>

          {description ? (
            <p className="text-muted-foreground max-w-prose text-sm">
              {description}
            </p>
          ) : null}
        </div>

        {action ? (
          <div className="flex flex-wrap items-center gap-2">{action}</div>
        ) : null}
      </div>
    </div>
  );
}
