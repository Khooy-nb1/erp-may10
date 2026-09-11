import React, { useState, useEffect } from 'react';
import { Receivable, ReceivableStatus, ReceivableSummary, AgingReport, AgingBucket } from '../../types/receivable.js';
import { getReceivables, getReceivableSummary, getAgingReport } from '../../services/receivableService.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { LoadingState } from '../../components/common/LoadingState.js';
import { EmptyState } from '../../components/common/EmptyState.js';
import { ErrorState } from '../../components/common/ErrorState.js';
import { useAuth } from '../../context/AuthContext.js';

type SortColumn = 'ngay_dao_han' | 'so_tien_con_lai';

const STATUS_LABELS: Record<ReceivableStatus, string> = {
  chua_thanh_toan: 'Chưa thanh toán',
  mot_phan: 'Thanh toán một phần',
  da_thanh_toan: 'Đã thanh toán',
  qua_han: 'Quá hạn',
};

const STATUS_STYLES: Record<ReceivableStatus, { bg: string; color: string }> = {
  chua_thanh_toan: { bg: '#fef9c3', color: '#854d0e' },
  mot_phan: { bg: '#e0e7ff', color: '#3730a3' },
  da_thanh_toan: { bg: '#dcfce7', color: '#15803d' },
  qua_han: { bg: '#fee2e2', color: '#b91c1c' },
};

const STATUS_OPTIONS: ReceivableStatus[] = ['chua_thanh_toan', 'mot_phan', 'da_thanh_toan', 'qua_han'];

export const ReceivableListPage: React.FC = () => {
  const { user } = useAuth();
  // GET /receivables/aging is restricted to admin and ke_toan; ban_hang must never request it.
  const canViewAging = user?.vai_tro === 'admin' || user?.vai_tro === 'ke_toan';

  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<ReceivableSummary | null>(null);
  const [aging, setAging] = useState<AgingReport | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [trangThai, setTrangThai] = useState<ReceivableStatus | ''>('');
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortColumn>('ngay_dao_han');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReceivables({
        page,
        pageSize,
        search: search.trim() || undefined,
        trang_thai: trangThai || undefined,
        overdueOnly: overdueOnly || undefined,
        sortBy,
        sortOrder,
      });
      setReceivables(res.receivables);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách công nợ phải thu');
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    setOverviewError(null);
    try {
      setSummary(await getReceivableSummary());
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : 'Không thể tải tổng quan công nợ');
      return;
    }
    if (canViewAging) {
      try {
        setAging(await getAgingReport());
      } catch (err) {
        setOverviewError(err instanceof Error ? err.message : 'Không thể tải báo cáo tuổi nợ');
      }
    }
  };

  useEffect(() => {
    fetchList();
  }, [page, trangThai, overdueOnly, sortBy, sortOrder]);

  useEffect(() => {
    fetchOverview();
  }, [canViewAging]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (page !== 1) {
      setPage(1);
    } else {
      fetchList();
    }
  };

  const handleSort = (column: SortColumn) => {
    setPage(1);
    if (sortBy === column) {
      setSortOrder((order) => (order === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortOrder(column === 'ngay_dao_han' ? 'ASC' : 'DESC');
    }
  };

  const sortIndicator = (column: SortColumn) => {
    if (sortBy !== column) return '';
    return sortOrder === 'ASC' ? ' ▲' : ' ▼';
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const renderStatusBadge = (st: ReceivableStatus) => {
    const config = STATUS_STYLES[st] || { bg: '#f1f5f9', color: '#475569' };
    return (
      <span
        style={{
          padding: '0.2rem 0.55rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          backgroundColor: config.bg,
          color: config.color,
        }}
      >
        {STATUS_LABELS[st] || st}
      </span>
    );
  };

  const agingBuckets: AgingBucket[] = aging
    ? [aging.current, aging.days1To30, aging.days31To60, aging.days61To90, aging.daysOver90]
    : [];
  const agingCountTotal = agingBuckets.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <div>
      <PageHeader
        title="Công nợ phải thu"
        subtitle={`Công nợ phải thu khách hàng, chỉ đọc trong phân hệ Bán hàng (${total} khoản)`}
      />

      {/* Read-only Notice */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          color: '#1e40af',
          fontSize: '0.85rem',
        }}
      >
        Phân hệ Bán hàng chỉ đọc dữ liệu công nợ. Ghi nhận thanh toán thuộc trách nhiệm Kế toán.
      </div>

      {/* Overview Error */}
      {overviewError && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            color: '#991b1b',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <span>Không thể tải đầy đủ số liệu tổng quan: {overviewError}</span>
          <button
            onClick={fetchOverview}
            style={{
              padding: '0.35rem 0.7rem',
              backgroundColor: '#ffffff',
              color: '#991b1b',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
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
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Tổng phát sinh</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', marginTop: '0.25rem' }}>
              {formatCurrency(summary.totalOriginal)}
            </div>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Đã thu</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#16a34a', marginTop: '0.25rem' }}>
              {formatCurrency(summary.totalPaid)}
            </div>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Còn phải thu</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb', marginTop: '0.25rem' }}>
              {formatCurrency(summary.totalOutstanding)}
            </div>
          </div>
          <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Quá hạn</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: Number(summary.totalOverdue) > 0 ? '#dc2626' : '#0f172a', marginTop: '0.25rem' }}>
              {formatCurrency(summary.totalOverdue)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.25rem' }}>
              {summary.overdueCount} khoản quá hạn
            </div>
          </div>
        </div>
      )}

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
            setTrangThai(e.target.value as ReceivableStatus | '');
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
          {STATUS_OPTIONS.map((st) => (
            <option key={st} value={st}>
              {STATUS_LABELS[st]}
            </option>
          ))}
        </select>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.875rem',
            color: '#334155',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={overdueOnly}
            onChange={(e) => {
              setOverdueOnly(e.target.checked);
              setPage(1);
            }}
          />
          Chỉ công nợ quá hạn
        </label>
      </div>

      {/* Aging Report (admin and ke_toan only) */}
      {canViewAging && aging && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            marginBottom: '1.5rem',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>Báo cáo tuổi nợ</h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Phân nhóm số tiền còn phải thu theo số ngày quá hạn so với ngày đáo hạn.
            </p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Nhóm tuổi nợ</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Số khoản</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Tiền còn phải thu</th>
              </tr>
            </thead>
            <tbody>
              {agingBuckets.map((bucket) => (
                <tr key={bucket.label} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.7rem 1rem', color: '#0f172a' }}>{bucket.label}</td>
                  <td style={{ padding: '0.7rem 1rem', textAlign: 'center', color: '#475569' }}>{bucket.count}</td>
                  <td style={{ padding: '0.7rem 1rem', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                    {formatCurrency(bucket.totalAmount)}
                  </td>
                </tr>
              ))}
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>Tổng cộng</td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                  {agingCountTotal}
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                  {formatCurrency(aging.totalReceivables)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Content State */}
      {loading ? (
        <LoadingState message="Đang tải danh sách công nợ phải thu..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchList} />
      ) : receivables.length === 0 ? (
        <EmptyState
          title="Không tìm thấy khoản công nợ nào"
          description="Thử thay đổi bộ lọc tìm kiếm hoặc bỏ điều kiện chỉ hiển thị công nợ quá hạn."
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
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Khách hàng</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Hóa đơn</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Phát sinh</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Đã thanh toán</th>
                <th
                  style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}
                  aria-sort={sortBy === 'so_tien_con_lai' ? (sortOrder === 'ASC' ? 'ascending' : 'descending') : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('so_tien_con_lai')}
                    title="Sắp xếp theo số tiền còn lại"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      font: 'inherit',
                      fontWeight: 600,
                      color: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    Còn lại{sortIndicator('so_tien_con_lai')}
                  </button>
                </th>
                <th
                  style={{ padding: '0.75rem 1rem', fontWeight: 600 }}
                  aria-sort={sortBy === 'ngay_dao_han' ? (sortOrder === 'ASC' ? 'ascending' : 'descending') : 'none'}
                >
                  <button
                    type="button"
                    onClick={() => handleSort('ngay_dao_han')}
                    title="Sắp xếp theo ngày đáo hạn"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      font: 'inherit',
                      fontWeight: 600,
                      color: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    Ngày đáo hạn{sortIndicator('ngay_dao_han')}
                  </button>
                </th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Số ngày quá hạn</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {receivables.map((rec) => {
                const daysOverdue = Number(rec.daysOverdue) || 0;
                return (
                  <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                    <td style={{ padding: '0.75rem 1rem', color: '#0f172a' }}>
                      <div style={{ fontWeight: 500 }}>{rec.ten_khach_hang || `Mã #${rec.ma_khach_hang}`}</div>
                      {rec.ma_khach_hang_code && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                          {rec.ma_khach_hang_code}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                      {rec.ma_hoa_don_code || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#0f172a', textAlign: 'right' }}>
                      {formatCurrency(rec.so_tien_phat_sinh)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#15803d', textAlign: 'right' }}>
                      {formatCurrency(rec.so_tien_da_thanh_toan)}
                    </td>
                    <td
                      style={{
                        padding: '0.75rem 1rem',
                        fontWeight: 700,
                        textAlign: 'right',
                        color: Number(rec.so_tien_con_lai) > 0 ? '#dc2626' : '#16a34a',
                      }}
                    >
                      {formatCurrency(rec.so_tien_con_lai)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{formatDate(rec.ngay_dao_han)}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {daysOverdue > 0 ? (
                        <span style={{ color: '#b91c1c', fontWeight: 600 }}>Quá hạn {daysOverdue} ngày</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{renderStatusBadge(rec.trang_thai)}</td>
                  </tr>
                );
              })}
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
              Trang {page} / {totalPages} (Tổng số {total} khoản công nợ)
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
