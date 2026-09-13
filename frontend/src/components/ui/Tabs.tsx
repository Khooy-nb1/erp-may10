import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/cn.js';

export interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

/** Tab set root. Compose as `Tabs > TabList > Tab…` plus one `TabPanel` per tab. */
export const Tabs: React.FC<TabsProps> = ({ value, onChange, children, className }) => (
  <TabsPrimitive.Root value={value} onValueChange={onChange} className={cn('flex flex-col gap-4', className)}>
    {children}
  </TabsPrimitive.Root>
);

export interface TabListProps {
  children: React.ReactNode;
  /** Accessible name for the tab set. */
  label?: string;
  className?: string;
}

export const TabList: React.FC<TabListProps> = ({ children, label = 'Tab', className }) => (
  <TabsPrimitive.List aria-label={label} className={cn('flex flex-wrap gap-1', className)}>
    {children}
  </TabsPrimitive.List>
);

export interface TabProps {
  value: string;
  label: string;
  className?: string;
}

export const Tab: React.FC<TabProps> = ({ value, label, className }) => (
  <TabsPrimitive.Trigger
    value={value}
    className={cn(
      'inline-flex items-center gap-2 border-b-2 border-transparent px-3 pb-2.5 pt-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary',
      className
    )}
  >
    {label}
  </TabsPrimitive.Trigger>
);

export interface TabPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({ value, children, className }) => (
  <TabsPrimitive.Content value={value} className={cn('focus-visible:outline-none', className)}>
    {children}
  </TabsPrimitive.Content>
);
