import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createInvoice } from '../../services/invoiceService.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { ErrorState } from '../../components/common/ErrorState.js';

export const InvoiceCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const [orderId, setOrderId] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !Number(orderId)) {
      setError('Vui lòng nhập ID đơn hàng hợp lệ.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const invoice = await createInvoice({
        ma_don_ban_hang: Number(orderId),
        ngay_xuat_hoa_don: issueDate,
        so_tien_da_thu: Number(paidAmount) || 0,
        ghi_chu: notes.trim() || null,
      });

      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể xuất hóa đơn bán hàng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Xuất hóa đơn bán hàng mới"
        subtitle="Lập hóa đơn tài chính liên kết đơn hàng đã được xác nhận (Kế toán &amp; Admin)"
      >
        <Link
          to="/invoices"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#ffffff',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          Hủy bỏ
        </Link>
      </PageHeader>

      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          maxWidth: '650px',
        }}
      >
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
              ID Đơn bán hàng *
            </label>
            <input
              type="number"
              placeholder="Nhập ID đơn hàng cần xuất hóa đơn (VD: 1)"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
              Hóa đơn chỉ được tạo cho đơn hàng đã xác nhận và chưa từng được xuất hóa đơn trước đó.
            </span>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
              Ngày xuất hóa đơn *
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
              Hạn thanh toán sẽ được hệ thống tính tự động dựa trên số ngày công nợ của khách hàng.
            </span>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
              Số tiền tạm ứng / đã thu ban đầu (VNĐ)
            </label>
            <input
              type="number"
              min="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(Math.max(0, Number(e.target.value)))}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
              Ghi chú hóa đơn
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Link
              to="/invoices"
              style={{
                padding: '0.6rem 1.25rem',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              Hủy
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.6rem 1.5rem',
                backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Đang xử lý...' : 'Xác nhận xuất hóa đơn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
