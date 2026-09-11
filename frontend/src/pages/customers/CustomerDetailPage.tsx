import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Customer, CustomerSummary } from '../../types/customer.js';
import { Receivable, ReceivableStatus, ReceivableSummary } from '../../types/receivable.js';
import { getCustomerById, getCustomerSummary, updateCustomerStatus } from '../../services/customerService.js';
import { getCustomerReceivables, getReceivableSummary } from '../../services/receivableService.js';
import { useAuth } from '../../context/AuthContext.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { LoadingState } from '../../components/common/LoadingState.js';
import { ErrorState } from '../../components/common/ErrorState.js';
import { EmptyState } from '../../components/common/EmptyState.js';

const RECEIVABLE_STATUS_CONFIG: Record<ReceivableStatus, { label: string; bg: string; color: string }> = {
  chua_thanh_toan: { label: 'Chưa thanh toán', bg: '#fef9c3', color: '#854d0e' },
  mot_phan: { label: 'Thanh toán một phần', bg: '#e0e7ff', color: '#3730a3' },
  da_thanh_toan: { label: 'Đã thanh toán', bg: '#dcfce7', color: '#15803d' },
  qua_han: { label: 'Quá hạn', bg: '#fee2e2', color: '#b91c1c' },
};

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

  // Receivables tab (lazy-loaded on first open)
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [receivableSummary, setReceivableSummary] = useState<ReceivableSummary | null>(null);
  const [receivablesLoading, setReceivablesLoading] = useState<boolean>(false);
  const [receivablesError, setReceivablesError] = useState<string | null>(null);
  const [receivablesLoadedFor, setReceivablesLoadedFor] = useState<number | null>(null);
  const [receivablesTotal, setReceivablesTotal] = useState<number>(0);
  const [receivablesReloadKey, setReceivablesReloadKey] = useState<number>(0);

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

  useEffect(() => {
    if (activeTab !== 'receivables' || !customerId || receivablesLoadedFor === customerId) {
      return;
    }

    let cancelled = false;
    setReceivablesLoading(true);
    setReceivablesError(null);

    Promise.all([getCustomerReceivables(customerId, { pageSize: 100 }), getReceivableSummary(customerId)])
      .then(([page, sum]) => {
        if (cancelled) return;
        setReceivables(page.receivables);
        setReceivablesTotal(page.meta.total);
        setReceivableSummary(sum);
        setReceivablesLoadedFor(customerId);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setReceivablesError(err instanceof Error ? err.message : 'Không thể tải sổ công nợ');
      })
      .finally(() => {
        if (!cancelled) setReceivablesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, customerId, receivablesLoadedFor, receivablesReloadKey]);

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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const renderReceivableStatus = (st: ReceivableStatus) => {
    const c = RECEIVABLE_STATUS_CONFIG[st] || { bg: '#f1f5f9', color: '#475569', label: st };
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
        <div>
          <div
            style={{
              padding: '0.6rem 1rem',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              color: '#1d4ed8',
              fontSize: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            Chỉ đọc — ghi nhận thanh toán thuộc Kế toán.
          </div>

          {receivablesError ? (
            <ErrorState
              message={receivablesError}
              onRetry={() => setReceivablesReloadKey((k) => k + 1)}
            />
          ) : receivablesLoading || receivablesLoadedFor !== customerId ? (
            <LoadingState message="Đang tải sổ công nợ..." />
          ) : receivables.length === 0 ? (
            <EmptyState
              title="Không có công nợ phải thu"
              description="Khách hàng này hiện không có khoản công nợ phải thu nào."
            />
          ) : (
            <>
              {receivableSummary && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ backgroundColor: '#ffffff', padding: '0.9rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Phát sinh</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
                      {formatCurrency(receivableSummary.totalOriginal)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '0.9rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Đã thu</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#15803d', marginTop: '0.2rem' }}>
                      {formatCurrency(receivableSummary.totalPaid)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '0.9rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Còn lại</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#d97706', marginTop: '0.2rem' }}>
                      {formatCurrency(receivableSummary.totalOutstanding)}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '0.9rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Quá hạn</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#dc2626', marginTop: '0.2rem' }}>
                      {formatCurrency(receivableSummary.totalOverdue)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                      {receivableSummary.overdueCount} khoản quá hạn
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Mã hóa đơn</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Phát sinh</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Đã thanh toán</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Còn lại</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Ngày đáo hạn</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Số ngày quá hạn</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivables.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                          {r.ma_hoa_don ? (
                            <Link to={`/invoices/${r.ma_hoa_don}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                              {r.ma_hoa_don_code || `#${r.ma_hoa_don}`}
                            </Link>
                          ) : (
                            r.ma_hoa_don_code || '—'
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>
                          {formatCurrency(r.so_tien_phat_sinh)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#15803d', textAlign: 'right' }}>
                          {formatCurrency(r.so_tien_da_thanh_toan)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#d97706', textAlign: 'right' }}>
                          {formatCurrency(r.so_tien_con_lai)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{formatDate(r.ngay_dao_han)}</td>
                        <td
                          style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'center',
                            fontWeight: r.daysOverdue && r.daysOverdue > 0 ? 600 : 400,
                            color: r.daysOverdue && r.daysOverdue > 0 ? '#dc2626' : '#94a3b8',
                          }}
                        >
                          {r.daysOverdue && r.daysOverdue > 0 ? r.daysOverdue : '—'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{renderReceivableStatus(r.trang_thai)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderTop: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    fontSize: '0.8rem',
                    color: '#64748b',
                  }}
                >
                  Hiển thị {receivables.length}/{receivablesTotal} khoản công nợ phải thu
                  {receivablesTotal > receivables.length && ' — xem đầy đủ tại trang Sổ công nợ.'}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
