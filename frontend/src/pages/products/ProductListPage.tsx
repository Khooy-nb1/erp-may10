import React, { useState, useEffect } from 'react';
import { Product, ProductStatus } from '../../types/product.js';
import { getProducts } from '../../services/productService.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { LoadingState } from '../../components/common/LoadingState.js';
import { EmptyState } from '../../components/common/EmptyState.js';
import { ErrorState } from '../../components/common/ErrorState.js';

export const ProductListPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [size, setSize] = useState<string>('');
  const [mauSac, setMauSac] = useState<string>('');
  const [trangThai, setTrangThai] = useState<ProductStatus | ''>('dang_ban');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProducts({
        page,
        pageSize,
        search: search.trim() || undefined,
        size: size.trim() || undefined,
        mau_sac: mauSac.trim() || undefined,
        trang_thai: trangThai || undefined,
      });
      setProducts(res.products);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh mục sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [page, size, mauSac, trangThai]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchList();
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
  };

  const renderStatusBadge = (st: ProductStatus) => {
    const config: Record<ProductStatus, { bg: string; color: string; label: string }> = {
      dang_ban: { bg: '#dcfce7', color: '#15803d', label: 'Đang bán' },
      ngung_ban: { bg: '#fee2e2', color: '#b91c1c', label: 'Ngừng bán' },
      mau_moi: { bg: '#e0e7ff', color: '#3730a3', label: 'Mẫu mới' },
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
        title="Tra cứu sản phẩm may mặc"
        subtitle={`Danh mục sản phẩm kinh doanh (${total} sản phẩm)`}
      />

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
            placeholder="Tìm theo mã sản phẩm hoặc tên hàng..."
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
            value={size}
            onChange={(e) => {
              setSize(e.target.value);
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
            <option value="">Tất cả kích cỡ</option>
            <option value="S">Size S</option>
            <option value="M">Size M</option>
            <option value="L">Size L</option>
            <option value="XL">Size XL</option>
            <option value="XXL">Size XXL</option>
          </select>
          <select
            value={mauSac}
            onChange={(e) => {
              setMauSac(e.target.value);
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
            <option value="">Tất cả màu sắc</option>
            <option value="Trắng">Màu Trắng</option>
            <option value="Xanh pastel">Xanh pastel</option>
            <option value="Đen">Màu Đen</option>
          </select>

          <select
            value={trangThai}
            onChange={(e) => {
              setTrangThai(e.target.value as ProductStatus | '');
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
            <option value="dang_ban">Đang bán</option>
            <option value="mau_moi">Mẫu mới</option>
            <option value="ngung_ban">Ngừng bán</option>
          </select>
        </div>
      </div>

      {/* Content State */}
      {loading ? (
        <LoadingState message="Đang tải danh mục sản phẩm..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchList} />
      ) : products.length === 0 ? (
        <EmptyState
          title="Không tìm thấy sản phẩm nào"
          description="Thử thay đổi từ khóa hoặc điều kiện lọc."
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
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Mã sản phẩm</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Tên sản phẩm</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Kích cỡ</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Màu sắc</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Đơn vị tính</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Giá bán niêm yết</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    transition: 'background-color 0.15s',
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                    {p.ma_san_pham}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#0f172a' }}>{p.ten_san_pham}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{p.size || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>{p.mau_sac || '—'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{p.ten_don_vi || 'Cái'}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#2563eb', textAlign: 'right' }}>
                    {formatCurrency(p.gia_ban)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{renderStatusBadge(p.trang_thai)}</td>
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
              Trang {page} / {totalPages} (Tổng số {total} sản phẩm)
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
