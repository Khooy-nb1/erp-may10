import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Không có dữ liệu',
  description = 'Hiện tại chưa có bản ghi nào để hiển thị.',
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px dashed #cbd5e1',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#94a3b8' }}>📭</div>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: '#1e293b' }}>{title}</h3>
      <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', color: '#64748b', maxWidth: '400px' }}>
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
