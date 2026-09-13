import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/cn.js';

const textVariants = cva('', {
  variants: {
    variant: {
      body: 'text-sm leading-6',
      supporting: 'text-sm leading-5 text-muted-foreground',
      label: 'text-sm font-medium leading-5',
      large: 'text-lg leading-7',
      code: 'font-mono text-sm',
    },
  },
  defaultVariants: {
    variant: 'body',
  },
});

export interface TextProps extends VariantProps<typeof textVariants> {
  /** Rendered element; defaults to `span` so text can drop into any layout. */
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
}

/**
 * The one place the type scale is defined. Weight, colour and numeric
 * alignment are ordinary utilities on `className`.
 */
export const Text: React.FC<TextProps> = ({ variant = 'body', as, className, children }) => {
  const Component = as ?? 'span';
  return <Component className={cn(textVariants({ variant }), className)}>{children}</Component>;
};

const headingVariants = cva('font-semibold text-foreground', {
  variants: {
    level: {
      1: 'text-2xl leading-8',
      2: 'text-xl leading-7',
      3: 'text-base leading-6',
    },
  },
  defaultVariants: {
    level: 2,
  },
});

const HEADING_ELEMENT = { 1: 'h1', 2: 'h2', 3: 'h3' } as const;

export interface HeadingProps extends VariantProps<typeof headingVariants> {
  level?: 1 | 2 | 3;
  className?: string;
  children?: React.ReactNode;
}

/** Section heading; `level` picks both the element and the size. */
export const Heading: React.FC<HeadingProps> = ({ level = 2, className, children }) => {
  const Component = HEADING_ELEMENT[level];
  return (
    <Component className={cn(headingVariants({ level }), className)}>{children}</Component>
  );
};
