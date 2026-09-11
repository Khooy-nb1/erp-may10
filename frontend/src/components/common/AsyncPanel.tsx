import React from 'react';
import { VStack } from '@astryxdesign/core/Stack';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { ErrorState } from './ErrorState.js';
import { EmptyState } from './EmptyState.js';

export interface AsyncPanelProps {
  /** Query is in flight (first load — keep the existing data visible on refetch). */
  isLoading: boolean;
  /** Error message from the request layer; falsy means no error. */
  error?: string | null;
  /** Whether the resolved payload is empty. */
  isEmpty?: boolean;
  /** Live-region message shown while loading. */
  loadingMessage?: string;
  /** Number of skeleton rows to show while loading. */
  skeletonRows?: number;
  errorCode?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  /** Rendered when the request has settled without error and with data. */
  children: React.ReactNode;
}

/**
 * Independent loading / error / empty / content states for one data region.
 * Each widget or table owns its own AsyncPanel so a failing request never
 * blanks a page that has other data.
 */
export const AsyncPanel: React.FC<AsyncPanelProps> = ({
  isLoading,
  error,
  isEmpty = false,
  loadingMessage = 'Đang tải dữ liệu...',
  skeletonRows = 4,
  errorCode,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyAction,
  children,
}) => {
  if (isLoading) {
    return (
      <VStack gap={2} aria-live="polite" aria-busy="true">
        <span
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
          }}
        >
          {loadingMessage}
        </span>
        {Array.from({ length: skeletonRows }, (_, index) => (
          <Skeleton key={index} index={index} height={20} radius={2} />
        ))}
      </VStack>
    );
  }

  if (error) {
    return <ErrorState code={errorCode} message={error} onRetry={onRetry} />;
  }

  if (isEmpty) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
    );
  }

  return <>{children}</>;
};
