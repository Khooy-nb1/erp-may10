import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { Text } from '../ui/Typography.js';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/** Empty state with a single call-to-action slot. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Không có dữ liệu',
  description = 'Hiện tại chưa có bản ghi nào để hiển thị.',
  action,
}) => {
  return (
    <div className="flex flex-col items-center gap-3 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-subtle-foreground">
        <Inbox size={22} aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <Text variant="label">{title}</Text>
        <Text variant="supporting">{description}</Text>
      </div>
      {action ? (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
};
