import React from 'react';
import { VStack } from '@astryxdesign/core/Stack';
import { Breadcrumbs, BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
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
  /** Widest the page content is allowed to grow. */
  maxWidth?: number | string;
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
  maxWidth,
  children,
}) => {
  return (
    <VStack gap={5} width="100%" maxWidth={maxWidth}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumbs variant="supporting">
          {breadcrumbs.map((entry, index) => (
            <BreadcrumbItem
              key={`${entry.label}-${index}`}
              href={entry.href}
              isCurrent={!entry.href || index === breadcrumbs.length - 1}
            >
              {entry.label}
            </BreadcrumbItem>
          ))}
        </Breadcrumbs>
      ) : null}
      <PageHeader title={title} subtitle={subtitle}>
        {actions}
      </PageHeader>
      {children}
    </VStack>
  );
};
