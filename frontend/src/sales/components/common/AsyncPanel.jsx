import React from 'react';
import { Skeleton } from '../ui/Skeleton.jsx';
import { ErrorState } from './ErrorState.jsx';
import { EmptyState } from './EmptyState.jsx';

/**
 * Independent loading / error / empty / content states for one data region.
 * Each widget or table owns its own AsyncPanel so a failing request never
 * blanks a page that has other data.
 *
 * Props (PH1 `AsyncPanelProps`): isLoading, error, isEmpty, loadingMessage,
 * skeletonRows, errorCode, onRetry, emptyTitle, emptyDescription, emptyAction,
 * skeleton, children.
 */
export const AsyncPanel = ({
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
