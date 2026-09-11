import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Invoice, InvoiceStatus } from '../../types/invoice.js';
import { getInvoices } from '../../services/invoiceService.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { LoadingState } from '../../components/common/LoadingState.js';
import { EmptyState } from '../../components/common/EmptyState.js';
import { ErrorState } from '../../components/common/ErrorState.js';
import { useAuth } from '../../context/AuthContext.js';

export const InvoiceListPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const canCreateInvoice = user?.vai_tro === 'ke_toan' || user?.vai_tro === 'admin';

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [trangThai, setTrangThai] = useState<InvoiceStatus | ''>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInvoices({
        page,
        pageSize,
        search: search.trim() || undefined,
        trang_thai: trangThai || undefined,
      });
      setInvoices(res.invoices);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [page, trangThai]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchList();
  };

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
      qua_han: { bg: '#fee2e2', color: '#b91c1c', label: 'Quá hạn' },
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

  return (
    <div>
      <PageHeader
        title="Quản lý hóa đơn bán hàng"
        subtitle={`Theo dõi xuất hóa đơn và tình trạng thanh toán (${total} hóa đơn)`}
      >
        {canCreateInvoice && (
          <Link
            to="/invoices/new"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            + Xuất hóa đơn mới
          </Link>
        )}
      </PageHeader>

      {/* Filter Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
          <input
            type="text"
            placeholder="Tìm theo mã hóa đơn hoặc tên khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.875rem',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Tìm kiếm
          </button>
        </form>

        <select
          value={trangThai}
          onChange={(e) => {
            setTrangThai(e.target.value as InvoiceStatus | '');
            setPage(1);
          }}
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '0.875rem',
            outline: 'none',
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="chua_thanh_toan">Chưa thanh toán</option>
          <option value="thanh_toan_mot_phan">Thanh toán một phần</option>
          <option value="da_thanh_toan">Đã thanh toán</option>
          <option value="qua_han">Quá hạn</option>
        </select>
      </div>

      {/* Content State */}
      {loading ? (
        <LoadingState message="Đang tải danh sách hóa đơn..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchList} />
      ) : invoices.length === 0 ? (
        <EmptyState
          title="Không tìm thấy hóa đơn nào"
          description="Thử thay đổi bộ lọc tìm kiếm hoặc tạo mới hóa đơn từ đơn hàng đã xác nhận."
        />
      ) : (
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
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Đơn bán hàng</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Khách hàng</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Ngày xuất</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Ngày đáo hạn</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Tổng thanh toán</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Đã thu</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Trạng thái</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background-color 0.15s',
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                    <Link to={`/invoices/${inv.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {inv.ma_hoa_don}
                    </Link>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#0f172a' }}>
                    <Link to={`/sales-orders/${inv.ma_don_ban_hang}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                      {inv.ma_don_ban || `Đơn #${inv.ma_don_ban_hang}`}
                    </Link>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
                    {inv.ten_khach_hang || `Mã #${inv.ma_khach_hang}`}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{formatDate(inv.ngay_xuat_hoa_don)}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{formatDate(inv.ngay_dao_han)}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#2563eb', textAlign: 'right' }}>
                    {formatCurrency(inv.tong_tien_sau_thue)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#15803d', textAlign: 'right' }}>
                    {formatCurrency(inv.so_tien_da_thu)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{renderStatusBadge(inv.trang_thai)}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <Link
                      to={`/invoices/${inv.id}`}
                      style={{
                        padding: '0.3rem 0.6rem',
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                      }}
                    >
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div
            style={{
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Trang {page} / {totalPages} (Tổng số {total} hóa đơn)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '0.4rem 0.8rem',
                  backgroundColor: page <= 1 ? '#e2e8f0' : '#ffffff',
                  color: page <= 1 ? '#94a3b8' : '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Trang trước
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: '0.4rem 0.8rem',
                  backgroundColor: page >= totalPages ? '#e2e8f0' : '#ffffff',
                  color: page >= totalPages ? '#94a3b8' : '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Trang sau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
