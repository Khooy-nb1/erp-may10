import React from 'react';
import { cn } from '../../lib/cn.js';
import { Heading } from './Typography.js';

const COLUMN_CLASSES: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
};

export interface MetadataListProps {
  /** Optional section heading above the list. */
  title?: string;
  /** Column count on wide viewports; always a single column on phones. */
  columns?: number;
  children: React.ReactNode;
}

/** Definition list of label/value pairs used by every record detail screen. */
export const MetadataList: React.FC<MetadataListProps> = ({ title, columns = 1, children }) => (
  <div className="flex flex-col gap-3">
    {title ? <Heading level={3}>{title}</Heading> : null}
    <dl className={cn('grid gap-x-6 gap-y-4', COLUMN_CLASSES[columns] ?? COLUMN_CLASSES[1])}>
      {children}
    </dl>
  </div>
);

export interface MetadataListItemProps {
  label: string;
  children?: React.ReactNode;
}

/** One label/value pair. */
export const MetadataListItem: React.FC<MetadataListItemProps> = ({ label, children }) => (
  <div className="flex min-w-0 flex-col gap-0.5">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="text-sm text-foreground">{children}</dd>
  </div>
);
