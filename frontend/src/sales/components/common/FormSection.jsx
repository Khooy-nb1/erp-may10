import React from 'react';
import { Card } from '../ui/Card.jsx';
import { Heading, Text } from '../ui/Typography.jsx';

/**
 * One titled block of a create/edit form. Sections stack inside a single page
 * scaffold so long forms stay scannable without a wizard.
 *
 * Props (PH1 `FormSectionProps`): title, description, actions, children.
 */
export const FormSection = ({ title, description, actions, children }) => {
  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Heading level={3}>{title}</Heading>
            {description ? (
              <Text variant="supporting" as="p">
                {description}
              </Text>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        <div className="border-t border-brand-border" />
        {children}
      </div>
    </Card>
  );
};
