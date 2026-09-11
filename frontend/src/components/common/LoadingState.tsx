import React from 'react';
import { VStack } from '@astryxdesign/core/Stack';
import { Spinner } from '@astryxdesign/core/Spinner';

export interface LoadingStateProps {
  message?: string;
}

/** Blocking in-page loading indicator with a polite live region. */
export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Đang tải dữ liệu...' }) => {
  return (
    <VStack gap={3} align="center" justify="center" padding={6}>
      <Spinner size="lg" label={message} />
    </VStack>
  );
};
