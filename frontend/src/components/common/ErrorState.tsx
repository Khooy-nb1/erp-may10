import React from 'react';

interface ErrorStateProps {
  code?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  code = 'ERROR',
  message = 'Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại.',
  onRetry,
}) => {
  return (
    <div
      role="alert"
      style={{
        padding: '1.5rem',
        backgroundColor: '#fef2f2',
        borderRadius: '8px',
        border: '1px solid #fecaca',
        color: '#991b1b',
        margin: '1rem 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Đã xảy ra lỗi</span>
            <span
              style={{
                fontSize: '0.75rem',
                backgroundColor: '#fee2e2',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                fontFamily: 'monospace',
              }}
            >
              {code}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#b91c1c' }}>{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: '0.4rem 0.8rem',
              backgroundColor: '#ffffff',
              color: '#991b1b',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Thử lại
          </button>
        )}
      </div>
    </div>
  );
};
