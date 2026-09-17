import React from 'react';
import { Banner } from '../ui/Banner.jsx';
import { Button } from '../ui/Button.jsx';

/** Non-blocking error surface with an optional retry action. */
export const ErrorState = ({
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
