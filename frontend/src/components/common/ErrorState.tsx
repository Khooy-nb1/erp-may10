import React from 'react';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';

export interface ErrorStateProps {
  code?: string;
  message?: string;
  onRetry?: () => void;
}

/** Non-blocking error surface with an optional retry action. */
export const ErrorState: React.FC<ErrorStateProps> = ({
  code = 'ERROR',
  message = 'Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại.',
  onRetry,
}) => {
  return (
    <Banner
      status="error"
      title="Đã xảy ra lỗi"
      description={`[${code}] ${message}`}
      collapsible={false}
      endContent={
        onRetry ? (
          <Button label="Thử lại" variant="secondary" size="sm" onClick={onRetry} />
        ) : undefined
      }
    />
  );
};
