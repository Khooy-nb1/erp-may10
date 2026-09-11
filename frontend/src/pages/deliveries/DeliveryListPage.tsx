import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Delivery, DeliveryStatus } from '../../types/delivery.js';
import { getDeliveries } from '../../services/deliveryService.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { LoadingState } from '../../components/common/LoadingState.js';
import { EmptyState } from '../../components/common/EmptyState.js';
import { ErrorState } from '../../components/common/ErrorState.js';

export const DeliveryListPage: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [trangThai, setTrangThai] = useState<DeliveryStatus | ''>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDeliveries({
        page,
        pageSize,
        search: search.trim() || undefined,
        trang_thai: trangThai || undefined,
      });
      setDeliveries(res.deliveries);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách đợt giao hàng');
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const renderStatusBadge = (st: DeliveryStatus) => {
    const config: Record<DeliveryStatus, { bg: string; color: string; label: string }> = {
      cho_giao: { bg: '#fef9c3', color: '#854d0e', label: 'Chờ giao hàng' },
      dang_giao: { bg: '#e0e7ff', color: '#3730a3', label: 'Đang vận chuyển' },
      da_giao: { bg: '#dcfce7', color: '#15803d', label: 'Đã giao thành công' },
      that_bai: { bg: '#fee2e2', color: '#b91c1c', label: 'Giao thất bại' },
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
        title="Quản lý giao hàng"
        subtitle={`Theo dõi vận chuyển và xác nhận giao nhận (${total} đợt giao)`}
      >
        <Link
          to="/deliveries/new"
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
          + Lập đợt giao hàng
        </Link>
      </PageHeader>

      {/* Notice Banner */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          color: '#475569',
        }}
      >
        ℹ️ <strong>Quy tắc nghiệp vụ:</strong> Phân hệ Giao hàng vận hành theo quy trình phiếu giao hàng cấp đầu phiếu (header-only). Việc hoàn thành giao hàng không tự động trừ tồn kho và không ghi nhận chi tiết dòng sản phẩm (tuân thủ giới hạn schema).
      </div>

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
            placeholder="Tìm theo mã giao hàng hoặc người nhận..."
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
            setTrangThai(e.target.value as DeliveryStatus | '');
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
          <option value="cho_giao">Chờ giao hàng</option>
          <option value="dang_giao">Đang vận chuyển</option>
          <option value="da_giao">Đã giao thành công</option>
          <option value="that_bai">Giao thất bại</option>
        </select>
      </div>

      {/* Content State */}
      {loading ? (
        <LoadingState message="Đang tải danh sách đợt giao hàng..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchList} />
      ) : deliveries.length === 0 ? (
        <EmptyState
          title="Không tìm thấy đợt giao hàng nào"
          description="Thử thay đổi bộ lọc tìm kiếm hoặc lập đợt giao hàng mới."
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
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Mã giao hàng</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Đơn bán hàng</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Kho xuất</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Ngày giao</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Người nhận</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Trạng thái</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr
                  key={d.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background-color 0.15s',
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                    <Link to={`/deliveries/${d.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {d.ma_giao_hang}
                    </Link>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#0f172a' }}>
                    <Link to={`/sales-orders/${d.ma_don_ban_hang}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                      {d.ma_don_ban || `Đơn #${d.ma_don_ban_hang}`}
                    </Link>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{d.ten_kho || `Kho #${d.ma_kho}`}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{formatDate(d.ngay_giao)}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{d.ten_nguoi_nhan}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{renderStatusBadge(d.trang_thai)}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <Link
                      to={`/deliveries/${d.id}`}
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
              Trang {page} / {totalPages} (Tổng số {total} đợt giao)
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
