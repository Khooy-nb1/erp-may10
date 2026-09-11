import React from 'react';
import { Link as RouterDomLink, type LinkProps as RouterDomLinkProps } from 'react-router-dom';

export interface RouterLinkProps
  extends Omit<RouterDomLinkProps, 'to'>,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'style' | 'className'> {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Adapter that lets Astryx render client-side navigation links.
 * Astryx link-bearing components pass `href`; React Router expects `to`.
 */
export const RouterLink: React.FC<RouterLinkProps> = ({ href, children, ...rest }) => {
  return (
    <RouterDomLink to={href} {...rest}>
      {children}
    </RouterDomLink>
  );
};

export default RouterLink;
