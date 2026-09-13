import React from 'react';
import { Breadcrumbs } from '../ui/Breadcrumbs.js';
import { PageHeader } from './PageHeader.js';

export interface BreadcrumbEntry {
  label: string;
  href?: string;
}

export interface PageScaffoldProps {
  title: string;
  subtitle?: string;
  /** Trail rendered above the title. The last entry is marked as the current page. */
  breadcrumbs?: BreadcrumbEntry[];
  /** Page-level actions, end-aligned beside the title. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Consistent page frame: optional breadcrumb trail, title block with actions,
 * then content. Every route renders inside this so page rhythm stays uniform.
 */
export const PageScaffold: React.FC<PageScaffoldProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
}) => {
  return (
    <div className="flex w-full flex-col gap-5">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumbs items={breadcrumbs.map((entry) => ({ label: entry.label, to: entry.href }))} />
      ) : null}
      <PageHeader title={title} subtitle={subtitle}>
        {actions}
      </PageHeader>
      <div className="flex w-full flex-col gap-5">{children}</div>
    </div>
  );
};
