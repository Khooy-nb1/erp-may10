import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Customer, CustomerSummary } from '../../types/customer.js';
import { getCustomerById, getCustomerSummary, updateCustomerStatus } from '../../services/customerService.js';
import { useAuth } from '../../context/AuthContext.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { LoadingState } from '../../components/common/LoadingState.js';
import { ErrorState } from '../../components/common/ErrorState.js';
import { EmptyState } from '../../components/common/EmptyState.js';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const customerId = Number(id);
  const { user } = useAuth();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'invoices' | 'receivables'>('info');

  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, s] = await Promise.all([
        getCustomerById(customerId),
        getCustomerSummary(customerId),
      ]);
      setCustomer(c);
      setSummary(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải thông tin khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchData();
    }
  }, [customerId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Bạn có chắc chắn muốn chuyển trạng thái khách hàng sang "${newStatus}"?`)) {
      return;
    }
    setUpdatingStatus(true);
    try {
      const updated = await updateCustomerStatus(customerId, newStatus);
      setCustomer(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
  };

  if (loading) {
    return <LoadingState message="Đang tải hồ sơ khách hàng..." />;
  }

  if (error || !customer) {
    return <ErrorState message={error || 'Không tìm thấy thông tin khách hàng'} onRetry={fetchData} />;
  }

  const isAdmin = user?.vai_tro === 'admin';

  return (
    <div>
      <PageHeader
        title={`${customer.ten_khach_hang} (${customer.ma_khach_hang})`}
        subtitle={`Loại: ${customer.loai_khach_hang} • Khu vực: ${customer.tinh_thanh_pho}`}
      >
        <Link
          to="/customers"
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
          ← Danh sách
        </Link>

        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {customer.trang_thai === 'hoat_dong' ? (
              <button
                disabled={updatingStatus}
                onClick={() => handleStatusChange('tam_khoa')}
                style={{
                  padding: '0.45rem 0.9rem',
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Tạm khóa
              </button>
            ) : (
              <button
                disabled={updatingStatus}
                onClick={() => handleStatusChange('hoat_dong')}
                style={{
                  padding: '0.45rem 0.9rem',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Kích hoạt lại
              </button>
            )}

            {customer.trang_thai !== 'ngung_giao_dich' && (
              <button
                disabled={updatingStatus}
                onClick={() => handleStatusChange('ngung_giao_dich')}
                style={{
                  padding: '0.45rem 0.9rem',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Ngừng giao dịch
              </button>
            )}
          </div>
        )}
      </PageHeader>

      {/* Commercial Summary Cards */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Tổng số đơn hàng</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '0.25rem' }}>
              {summary.totalOrders}
            </div>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Tổng giá trị đặt hàng</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb', marginTop: '0.25rem' }}>
              {formatCurrency(summary.totalOrderValue)}
            </div>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Công nợ phải thu hiện tại</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#d97706', marginTop: '0.25rem' }}>
              {formatCurrency(summary.outstandingReceivable)}
            </div>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Nợ quá hạn</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626', marginTop: '0.25rem' }}>
              {formatCurrency(summary.overdueReceivable)}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #cbd5e1', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('info')}
          style={{
            padding: '0.6rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'info' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'info' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'info' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          Thông tin chi tiết
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '0.6rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'orders' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'orders' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'orders' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          Đơn bán hàng
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          style={{
            padding: '0.6rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'invoices' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'invoices' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'invoices' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          Hóa đơn
        </button>
        <button
          onClick={() => setActiveTab('receivables')}
          style={{
            padding: '0.6rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'receivables' ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === 'receivables' ? '#2563eb' : '#64748b',
            fontWeight: activeTab === 'receivables' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          Sổ công nợ
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Mã số thuế</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#0f172a', marginTop: '0.2rem' }}>
                {customer.ma_so_thue || 'Chưa cập nhật'}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Số điện thoại</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#0f172a', marginTop: '0.2rem' }}>
                {customer.so_dien_thoai}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Email</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#0f172a', marginTop: '0.2rem' }}>
                {customer.email || 'Chưa cập nhật'}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Người liên hệ</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#0f172a', marginTop: '0.2rem' }}>
                {customer.nguoi_lien_he || 'Chưa cập nhật'}
              </div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Địa chỉ</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#0f172a', marginTop: '0.2rem' }}>
                {customer.dia_chi}, {customer.tinh_thanh_pho}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Hạn mức công nợ được cấp</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2563eb', marginTop: '0.2rem' }}>
                {formatCurrency(customer.han_muc_cong_no)}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Thời hạn nợ tối đa</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#0f172a', marginTop: '0.2rem' }}>
                {customer.so_ngay_cong_no} ngày
              </div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Ghi chú nội bộ</span>
              <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '0.2rem' }}>
                {customer.ghi_chu || 'Không có ghi chú'}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <EmptyState
          title="Đơn bán hàng của khách"
          description="Danh sách đơn hàng liên kết sẽ hiển thị khi phân hệ Đơn bán hàng (P5) được hoàn thiện."
        />
      )}

      {activeTab === 'invoices' && (
        <EmptyState
          title="Hóa đơn bán hàng"
          description="Danh sách hóa đơn liên kết sẽ hiển thị khi phân hệ Hóa đơn (P7) được hoàn thiện."
        />
      )}

      {activeTab === 'receivables' && (
        <EmptyState
          title="Sổ chi tiết công nợ"
          description="Lịch sử công nợ phải thu sẽ hiển thị khi phân hệ Công nợ (P8) được hoàn thiện."
        />
      )}
    </div>
  );
};
