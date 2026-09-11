import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Invoice, InvoiceStatus } from '../../types/invoice.js';
import { getInvoiceById } from '../../services/invoiceService.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { LoadingState } from '../../components/common/LoadingState.js';
import { ErrorState } from '../../components/common/ErrorState.js';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const invoiceId = Number(id);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoice = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInvoiceById(invoiceId);
      setInvoice(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải chi tiết hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const renderStatusBadge = (st: InvoiceStatus) => {
    const config: Record<InvoiceStatus, { bg: string; color: string; label: string }> = {
      chua_thanh_toan: { bg: '#fef9c3', color: '#854d0e', label: 'Chưa thanh toán' },
      thanh_toan_mot_phan: { bg: '#e0e7ff', color: '#3730a3', label: 'Thanh toán một phần' },
      da_thanh_toan: { bg: '#dcfce7', color: '#15803d', label: 'Đã thanh toán' },
      qua_han: { bg: '#fee2e2', color: '#b91c1c', label: 'Quá hạn thanh toán' },
    };
    const c = config[st] || { bg: '#f1f5f9', color: '#475569', label: st };
    return (
      <span
        style={{
          padding: '0.2rem 0.55rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: c.bg,
          color: c.color,
        }}
      >
        {c.label}
      </span>
    );
  };

  if (loading) {
    return <LoadingState message="Đang tải chi tiết hóa đơn..." />;
  }

  if (error || !invoice) {
    return <ErrorState message={error || 'Không tìm thấy hóa đơn'} onRetry={fetchInvoice} />;
  }

  const remainingDebt = Math.max(0, Number(invoice.tong_tien_sau_thue) - Number(invoice.so_tien_da_thu));
  const isOverdue = invoice.trang_thai === 'qua_han';

  return (
    <div>
      <PageHeader
        title={`Hóa đơn: ${invoice.ma_hoa_don}`}
        subtitle={`Ngày xuất: ${formatDate(invoice.ngay_xuat_hoa_don)} • Hạn thanh toán: ${formatDate(invoice.ngay_dao_han)}`}
      >
        <Link
          to="/invoices"
          style={{
            padding: '0.45rem 0.9rem',
            backgroundColor: '#ffffff',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          ← Danh sách hóa đơn
        </Link>
      </PageHeader>

      {/* Overdue Warning Alert */}
      {isOverdue && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Hóa đơn đã quá hạn thanh toán</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Hóa đơn này đã quá ngày đáo hạn ({formatDate(invoice.ngay_dao_han)}). Số tiền còn nợ:{' '}
              <strong>{formatCurrency(remainingDebt)}</strong>. Cần liên hệ đối tác để thu hồi nợ.
            </div>
          </div>
        </div>
      )}

      {/* Financial Summary Breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Tiền trước thuế</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginTop: '0.25rem' }}>
            {formatCurrency(invoice.tong_tien_truoc_thue)}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Tiền thuế GTGT</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginTop: '0.25rem' }}>
            {formatCurrency(invoice.tien_thue)}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Tổng tiền sau thuế</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb', marginTop: '0.25rem' }}>
            {formatCurrency(invoice.tong_tien_sau_thue)}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Đã thu lũy kế</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#16a34a', marginTop: '0.25rem' }}>
            {formatCurrency(invoice.so_tien_da_thu)}
          </div>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Còn phải thu</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: remainingDebt > 0 ? '#dc2626' : '#16a34a', marginTop: '0.25rem' }}>
            {formatCurrency(remainingDebt)}
          </div>
        </div>
      </div>

      {/* Invoice Information Card */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0f172a' }}>Thông tin chứng từ liên kết</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', fontSize: '0.875rem' }}>
          <div>
            <span style={{ color: '#64748b' }}>Đơn bán hàng liên kết:</span>
            <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>
              <Link to={`/sales-orders/${invoice.ma_don_ban_hang}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                {invoice.ma_don_ban || `Đơn hàng #${invoice.ma_don_ban_hang}`}
              </Link>
            </div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Khách hàng:</span>
            <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>
              <Link to={`/customers/${invoice.ma_khach_hang}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                {invoice.ten_khach_hang || `Khách hàng #${invoice.ma_khach_hang}`}
              </Link>
            </div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Trạng thái thanh toán:</span>
            <div style={{ marginTop: '0.2rem' }}>{renderStatusBadge(invoice.trang_thai)}</div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Ngày xuất hóa đơn:</span>
            <div style={{ fontWeight: 500, marginTop: '0.2rem' }}>{formatDate(invoice.ngay_xuat_hoa_don)}</div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Hạn thanh toán (Đáo hạn):</span>
            <div style={{ fontWeight: 500, marginTop: '0.2rem' }}>{formatDate(invoice.ngay_dao_han)}</div>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Ghi chú:</span>
            <div style={{ color: '#475569', marginTop: '0.2rem' }}>{invoice.ghi_chu || 'Không có ghi chú'}</div>
          </div>
        </div>
      </div>

      {/* Informational Disclaimer Card */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '1rem 1.25rem',
          fontSize: '0.85rem',
          color: '#475569',
          lineHeight: 1.5,
        }}
      >
        ℹ️ <strong>Lưu ý về lịch sử thanh toán:</strong> Cơ sở dữ liệu ERP hiện tại chỉ lưu trữ số tiền đã thu lũy kế (`so_tien_da_thu`) mà không có bảng nhật ký từng đợt thanh toán (`chi_tiet_thanh_toan`). Do đó, giao diện không hiển thị lịch sử phân kỳ thanh toán để đảm bảo tính toàn vẹn dữ liệu.
      </div>
    </div>
  );
};
