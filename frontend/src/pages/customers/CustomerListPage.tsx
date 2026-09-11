import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Customer, CustomerType, CustomerStatus } from '../../types/customer.js';
import { getCustomers } from '../../services/customerService.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { LoadingState } from '../../components/common/LoadingState.js';
import { EmptyState } from '../../components/common/EmptyState.js';
import { ErrorState } from '../../components/common/ErrorState.js';

export const CustomerListPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [loaiKhachHang, setLoaiKhachHang] = useState<CustomerType | ''>('');
  const [trangThai, setTrangThai] = useState<CustomerStatus | ''>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCustomers({
        page,
        pageSize,
        search: search.trim() || undefined,
        loai_khach_hang: loaiKhachHang || undefined,
        trang_thai: trangThai || undefined,
      });
      setCustomers(res.customers);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [page, loaiKhachHang, trangThai]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchList();
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
  };

  const renderStatusBadge = (st: CustomerStatus) => {
    const config: Record<CustomerStatus, { bg: string; color: string; label: string }> = {
      hoat_dong: { bg: '#dcfce7', color: '#15803d', label: 'Hoạt động' },
      tam_khoa: { bg: '#fef9c3', color: '#854d0e', label: 'Tạm khóa' },
      ngung_giao_dich: { bg: '#fee2e2', color: '#b91c1c', label: 'Ngừng giao dịch' },
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
        title="Quản lý khách hàng"
        subtitle={`Tổng số ${total} khách hàng trong hệ thống`}
      >
        <Link
          to="/customers/new"
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
          + Thêm khách hàng mới
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
            placeholder="Tìm theo mã, tên, số điện thoại, MST..."
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

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={loaiKhachHang}
            onChange={(e) => {
              setLoaiKhachHang(e.target.value as CustomerType | '');
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
            <option value="">Tất cả loại khách</option>
            <option value="to_chuc">Tổ chức</option>
            <option value="ca_nhan">Cá nhân</option>
            <option value="dai_ly">Đại lý</option>
            <option value="xuat_khau">Xuất khẩu</option>
          </select>

          <select
            value={trangThai}
            onChange={(e) => {
              setTrangThai(e.target.value as CustomerStatus | '');
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
            <option value="hoat_dong">Hoạt động</option>
            <option value="tam_khoa">Tạm khóa</option>
            <option value="ngung_giao_dich">Ngừng giao dịch</option>
          </select>
        </div>
      </div>

      {/* Content State */}
      {loading ? (
        <LoadingState message="Đang tải danh sách khách hàng..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchList} />
      ) : customers.length === 0 ? (
        <EmptyState
          title="Không tìm thấy khách hàng nào"
          description="Thử thay đổi bộ lọc tìm kiếm hoặc tạo mới khách hàng."
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
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Mã khách</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Tên khách hàng</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Loại</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Số điện thoại</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Tỉnh/Thành</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Hạn mức công nợ</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Trạng thái</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background-color 0.15s',
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                    <Link to={`/customers/${c.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {c.ma_khach_hang}
                    </Link>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#0f172a' }}>{c.ten_khach_hang}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{c.loai_khach_hang}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{c.so_dien_thoai}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{c.tinh_thanh_pho}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#0f172a' }}>
                    {formatCurrency(c.han_muc_cong_no)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{renderStatusBadge(c.trang_thai)}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <Link
                      to={`/customers/${c.id}`}
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
              Trang {page} / {totalPages} (Tổng số {total} bản ghi)
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
