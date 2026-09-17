import React from 'react';
import { Spinner } from '../ui/Spinner.jsx';

/** Blocking in-page loading indicator with a polite live region. */
export const LoadingState = ({ message = 'Đang tải dữ liệu...' }) => {
  return (
    <div className="grid place-items-center gap-3 p-6">
      <Spinner size="lg" label={message} />
    </div>
  );
};
