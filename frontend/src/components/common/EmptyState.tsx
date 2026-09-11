import React from 'react';
import { EmptyState as AstryxEmptyState } from '@astryxdesign/core/EmptyState';
import { Button } from '@astryxdesign/core/Button';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/** Astryx empty state with a single call-to-action slot. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Không có dữ liệu',
  description = 'Hiện tại chưa có bản ghi nào để hiển thị.',
  action,
}) => {
  return (
    <AstryxEmptyState
      title={title}
      description={description}
      actions={
        action ? <Button label={action.label} variant="primary" onClick={action.onClick} /> : undefined
      }
    />
  );
};
