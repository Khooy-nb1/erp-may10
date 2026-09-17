import React from 'react';
import { Breadcrumbs } from '../ui/Breadcrumbs.jsx';
import { PageHeader } from './PageHeader.jsx';

/**
 * Consistent page frame: optional breadcrumb trail, title block with actions,
 * then content. Every route renders inside this so page rhythm stays uniform.
 *
 * Props (PH1 `PageScaffoldProps`): title, subtitle, breadcrumbs, actions,
 * children. A breadcrumb entry is `{ label, href? }`.
 */
export const PageScaffold = ({ title, subtitle, breadcrumbs, actions, children }) => {
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
