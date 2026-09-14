import React from 'react';
import { Skeleton } from '../ui/Skeleton.js';
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
  /**
   * Caller-shaped placeholder shown while loading, for regions whose geometry a
   * generic text skeleton would misrepresent, e.g. charts.
   */
  skeleton?: React.ReactNode;
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
  skeleton,
  children,
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4" aria-live="polite" aria-busy="true">
        <span className="sr-only">{loadingMessage}</span>
        {skeleton ??
          Array.from({ length: skeletonRows }, (_, index) => (
            <Skeleton key={index} className="h-5 w-full" />
          ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <ErrorState code={errorCode} message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (isEmpty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return <>{children}</>;
};
