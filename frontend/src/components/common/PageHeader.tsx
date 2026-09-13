import React from 'react';
import { Heading, Text } from '../ui/Typography.js';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

/**
 * Page title block: heading, optional supporting line, optional end-aligned actions.
 * Call sites pass page actions through `children`.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, children }) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading level={2}>{title}</Heading>
          {subtitle ? (
            <Text variant="supporting" as="p">
              {subtitle}
            </Text>
          ) : null}
        </div>
        {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
      <div className="border-t border-border" />
    </div>
  );
};
