import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, children }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #e2e8f0',
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#0f172a' }}>{title}</h1>
        {subtitle && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>{subtitle}</p>}
      </div>
      {children && <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>{children}</div>}
    </div>
  );
};
