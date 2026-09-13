import React from 'react';
import { Spinner } from '../ui/Spinner.js';

export interface LoadingStateProps {
  message?: string;
}

/** Blocking in-page loading indicator with a polite live region. */
export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Đang tải dữ liệu...' }) => {
  return (
    <div className="grid place-items-center gap-3 p-6">
      <Spinner size="lg" label={message} />
    </div>
  );
};
