import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Order, OrderStatus } from '../../types/order.js';
import { getOrders } from '../../services/orderService.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { LoadingState } from '../../components/common/LoadingState.js';
import { EmptyState } from '../../components/common/EmptyState.js';
import { ErrorState } from '../../components/common/ErrorState.js';

export const SalesOrderListPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [trangThai, setTrangThai] = useState<OrderStatus | ''>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrders({
        page,
        pageSize,
        search: search.trim() || undefined,
        trang_thai: trangThai || undefined,
      });
      setOrders(res.orders);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách đơn bán hàng');
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

  const renderStatusBadge = (st: OrderStatus) => {
    const config: Record<OrderStatus, { bg: string; color: string; label: string }> = {
      cho_xac_nhan: { bg: '#fef9c3', color: '#854d0e', label: 'Chờ xác nhận' },
      da_xac_nhan: { bg: '#e0e7ff', color: '#3730a3', label: 'Đã xác nhận' },
      dang_san_xuat: { bg: '#f3e8ff', color: '#6b21a8', label: 'Đang sản xuất' },
      da_giao: { bg: '#dcfce7', color: '#15803d', label: 'Đã giao hàng' },
      huy: { bg: '#fee2e2', color: '#b91c1c', label: 'Đã hủy' },
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
        title="Quản lý đơn bán hàng"
        subtitle={`Theo dõi và xử lý đơn hàng (${total} đơn hàng)`}
      >
        <Link
          to="/sales-orders/new"
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
          + Tạo đơn hàng mới
        </Link>
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
            placeholder="Tìm theo mã đơn hàng hoặc tên khách..."
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
            setTrangThai(e.target.value as OrderStatus | '');
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
          <option value="cho_xac_nhan">Chờ xác nhận</option>
          <option value="da_xac_nhan">Đã xác nhận</option>
          <option value="dang_san_xuat">Đang sản xuất</option>
          <option value="da_giao">Đã giao hàng</option>
          <option value="huy">Đã hủy</option>
        </select>
      </div>

      {/* Content State */}
      {loading ? (
        <LoadingState message="Đang tải danh sách đơn bán hàng..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchList} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Không tìm thấy đơn hàng nào"
          description="Thử thay đổi bộ lọc tìm kiếm hoặc tạo đơn bán hàng mới."
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
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Mã đơn</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Khách hàng</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Ngày đặt</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Hạn giao</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Tổng thanh toán</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Người bán</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Trạng thái</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background-color 0.15s',
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                    <Link to={`/sales-orders/${o.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {o.ma_don_ban}
                    </Link>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#0f172a' }}>
                    {o.ten_khach_hang || `Khách #${o.ma_khach_hang}`}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{formatDate(o.ngay_dat_hang)}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{formatDate(o.ngay_giao_hang_yc)}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#2563eb', textAlign: 'right' }}>
                    {formatCurrency(o.tong_thanh_toan)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{o.ten_nguoi_ban || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{renderStatusBadge(o.trang_thai)}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <Link
                      to={`/sales-orders/${o.id}`}
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
              Trang {page} / {totalPages} (Tổng số {total} đơn hàng)
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
