import React from 'react';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Divider } from '@astryxdesign/core/Divider';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

/**
 * Page title block: heading, optional supporting line, optional end-aligned actions.
 * Call sites pass page actions through `children`.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, children }) => {
  return (
    <VStack gap={3}>
      <HStack gap={4} vAlign="start" hAlign="between" wrap="wrap">
        <VStack gap={1}>
          <Heading level={2}>{title}</Heading>
          {subtitle ? (
            <Text type="supporting" as="p">
              {subtitle}
            </Text>
          ) : null}
        </VStack>
        {children ? (
          <HStack gap={2} vAlign="center" wrap="wrap">
            {children}
          </HStack>
        ) : null}
      </HStack>
      <Divider />
    </VStack>
  );
};
