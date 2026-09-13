import React from 'react';
import { Banner } from '../ui/Banner.js';
import { Button } from '../ui/Button.js';

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
      endContent={
        onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Thử lại
          </Button>
        ) : undefined
      }
    />
  );
};
