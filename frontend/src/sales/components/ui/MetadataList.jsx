import React from 'react';
import { cn } from '../../lib/cn.js';
import { Heading } from './Typography.jsx';

const COLUMN_CLASSES = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
};

/** Definition list of label/value pairs used by every record detail screen. */
export function MetadataList({ title, columns = 1, children }) {
  return (
    <div className="flex flex-col gap-3">
      {title ? <Heading level={3}>{title}</Heading> : null}
      <dl className={cn('grid gap-x-6 gap-y-4', COLUMN_CLASSES[columns] ?? COLUMN_CLASSES[1])}>
        {children}
      </dl>
    </div>
  );
}

/** One label/value pair. */
export function MetadataListItem({ label, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-sm text-brand-secondary">{label}</dt>
      <dd className="text-sm text-brand-text">{children}</dd>
    </div>
  );
}
