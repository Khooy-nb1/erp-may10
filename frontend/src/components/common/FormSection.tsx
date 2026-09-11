import React from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/Stack';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Divider } from '@astryxdesign/core/Divider';

export interface FormSectionProps {
  title: string;
  description?: string;
  /** Section-level actions (add-row, reset, …), end-aligned in the header. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * One titled block of a create/edit form. Sections stack inside a single page
 * scaffold so long forms stay scannable without a wizard.
 */
export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  actions,
  children,
}) => {
  return (
    <Card>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={3}>{title}</Heading>
          {description ? (
            <Text type="supporting" as="p">
              {description}
            </Text>
          ) : null}
          {actions ? <div>{actions}</div> : null}
        </VStack>
        <Divider />
        {children}
      </VStack>
    </Card>
  );
};
