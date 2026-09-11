import React, { useCallback, useEffect, useState } from 'react';
import {
  DashboardPeriod,
  DashboardQueryParams,
  DashboardSummary,
  OrderStatusBreakdown,
  RevenueChart,
  TopCustomers,
  TopProducts,
} from '../../types/dashboard.js';
import {
  getDashboardSummary,
  getOrderStatus,
  getRevenueChart,
  getTopCustomers,
  getTopProducts,
} from '../../services/dashboardService.js';
import { PageHeader } from '../../components/common/PageHeader.js';
import { LoadingState } from '../../components/common/LoadingState.js';
import { EmptyState } from '../../components/common/EmptyState.js';
import { ErrorState } from '../../components/common/ErrorState.js';
import { useAuth } from '../../context/AuthContext.js';

/**
 * P9 dashboard.
 *
 * Each widget owns its own request, loading and error state: a failing revenue
 * chart must not blank out the KPI cards or the status breakdown. That is why
 * every panel below is wrapped in its own `Widget` boundary rather than sharing
 * one page-level loading flag.
 *
 * Role scoping is enforced server-side; the client additionally avoids *calling*
 * endpoints the role is denied (`kho` on the three money endpoints) so a
 * legitimate page load never produces a 403.
 */

type Loadable<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

/** One independent widget request. Each call site gets its own state slot. */
function useWidget<T>(
  fetcher: (params: DashboardQueryParams) => Promise<T>,
  params: DashboardQueryParams,
  enabled: boolean
): Loadable<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState<number>(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // Serialized so the effect depends on values, not on a fresh object identity
  // each render (which would re-fetch forever).
  const paramKey = JSON.stringify(params);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher(JSON.parse(paramKey) as DashboardQueryParams)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được số liệu.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `fetcher` is a stable module-level function at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey, enabled, nonce]);

  return { data, loading, error, reload };
}

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: 'month', label: 'Tháng này' },
  { value: 'quarter', label: 'Quý này' },
  { value: 'year', label: 'Năm nay' },
  { value: 'custom', label: 'Tùy chọn' },
];

/** Label per `don_ban_hang.trang_thai`; unknown values fall back to the raw code. */
const STATUS_LABELS: Record<string, string> = {
  cho_xac_nhan: 'Chờ xác nhận',
  da_xac_nhan: 'Đã xác nhận',
  dang_san_xuat: 'Đang sản xuất',
  da_giao: 'Đã giao',
  huy: 'Đã hủy',
};

const STATUS_COLORS: Record<string, string> = {
  cho_xac_nhan: '#f59e0b',
  da_xac_nhan: '#3b82f6',
  dang_san_xuat: '#8b5cf6',
  da_giao: '#10b981',
  huy: '#ef4444',
};

const formatCurrency = (value: string | number | undefined): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value ?? 0) || 0);

const formatQuantity = (value: string | number | undefined): string =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(Number(value ?? 0) || 0);

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '0.5rem',
  padding: '1rem 1.25rem',
  minWidth: 0,
};

const cardTitleStyle: React.CSSProperties = {
  margin: '0 0 0.75rem',
  fontSize: '0.95rem',
  fontWeight: 600,
  color: '#0f172a',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.5rem 0.75rem',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  color: '#64748b',
  borderBottom: '1px solid #e2e8f0',
};

const tdStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  borderBottom: '1px solid #f1f5f9',
};

/** Shared panel boundary: loading, error and empty are handled identically per widget. */
const Widget: React.FC<{
  title: string;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  onRetry: () => void;
  emptyMessage: string;
  children: React.ReactNode;
}> = ({ title, loading, error, isEmpty, onRetry, emptyMessage, children }) => (
  <section style={cardStyle}>
    <h3 style={cardTitleStyle}>{title}</h3>
    {loading ? (
      <LoadingState />
    ) : error ? (
      <ErrorState message={error} onRetry={onRetry} />
    ) : isEmpty ? (
      <EmptyState title="Chưa có dữ liệu" description={emptyMessage} />
    ) : (
      children
    )}
  </section>
);

/** Horizontal bar list shared by the revenue and status widgets. */
const BarList: React.FC<{
  rows: Array<{ key: string; label: string; value: number; display: string; color?: string }>;
}> = ({ rows }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {rows.map((row) => (
        <div key={row.key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#334155' }}>
            <span>{row.label}</span>
            <span style={{ fontWeight: 600 }}>{row.display}</span>
          </div>
          <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '0.5rem', marginTop: '0.25rem' }}>
            <div
              style={{
                width: `${Math.max((row.value / max) * 100, row.value > 0 ? 2 : 0)}%`,
                background: row.color ?? '#2563eb',
                height: '100%',
                borderRadius: '999px',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.vai_tro ?? '';

  // `kho` is denied the three money endpoints (roles-permissions §3.2), so the
  // client must not issue those requests at all.
  const canViewMoney = role === 'admin' || role === 'ban_hang' || role === 'ke_toan';
  const canViewReceivables = role === 'admin' || role === 'ke_toan';

  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const customRangeIncomplete = period === 'custom' && (!fromDate || !toDate);

  const params: DashboardQueryParams = {
    period,
    ...(period === 'custom' ? { fromDate, toDate } : {}),
    limit: 5,
  };

  const summary = useWidget<DashboardSummary>(getDashboardSummary, params, true);
  const status = useWidget<OrderStatusBreakdown>(getOrderStatus, params, true);
  const revenue = useWidget<RevenueChart>(getRevenueChart, params, canViewMoney);
  const topCustomers = useWidget<TopCustomers>(getTopCustomers, params, canViewMoney);
  const topProducts = useWidget<TopProducts>(getTopProducts, params, canViewMoney);

  const refreshAll = () => {
    summary.reload();
    status.reload();
    if (canViewMoney) {
      revenue.reload();
      topCustomers.reload();
      topProducts.reload();
    }
  };

  const metrics = summary.data?.metrics;
  const statusCounts = metrics?.statusCounts ?? {};
  const statusRows = Object.entries(statusCounts);
  const statusTotal = statusRows.reduce((sum, [, count]) => sum + count, 0);

  const revenueRows = revenue.data?.series ?? [];
  const revenueMaxTotal = revenue.data?.total;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <PageHeader
        title="Tổng quan kinh doanh"
        subtitle="Số liệu doanh thu, tình trạng đơn hàng và công nợ bán hàng"
      />

      {/* Shared date filter — one control drives every widget. */}
      <section style={{ ...cardStyle, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '0.75rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
            Khoảng thời gian
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as DashboardPeriod)}
            style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1', minWidth: '10rem' }}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {period === 'custom' && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Từ ngày
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                Đến ngày
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
              />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={refreshAll}
          disabled={customRangeIncomplete}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: '1px solid #2563eb',
            background: customRangeIncomplete ? '#cbd5e1' : '#2563eb',
            color: '#fff',
            cursor: customRangeIncomplete ? 'not-allowed' : 'pointer',
          }}
        >
          Làm mới
        </button>

        {customRangeIncomplete && (
          <span style={{ fontSize: '0.8rem', color: '#b45309' }}>
            Chọn đủ ngày bắt đầu và kết thúc để xem số liệu tùy chọn.
          </span>
        )}
      </section>

      {/* KPI cards — role-scoped by the server; absent metrics are simply not rendered. */}
      <Widget
        title="Chỉ số chính"
        loading={summary.loading}
        error={summary.error}
        isEmpty={!summary.data}
        onRetry={summary.reload}
        emptyMessage="Chưa có số liệu trong khoảng thời gian đã chọn."
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))',
            gap: '0.75rem',
          }}
        >
          {metrics?.orderCount !== undefined && (
            <Kpi label="Tổng số đơn" value={String(metrics.orderCount)} />
          )}
          {metrics?.totalOrderValue !== undefined && (
            <Kpi label="Giá trị đơn hàng" value={formatCurrency(metrics.totalOrderValue)} />
          )}
          {metrics?.openReceivable !== undefined && (
            <Kpi label="Công nợ phải thu" value={formatCurrency(metrics.openReceivable)} tone="info" />
          )}
          {metrics?.overdueReceivable !== undefined && (
            <Kpi label="Công nợ quá hạn" value={formatCurrency(metrics.overdueReceivable)} tone="danger" />
          )}
          {metrics?.unpaidInvoiceCount !== undefined && (
            <Kpi label="Hóa đơn chưa thu đủ" value={String(metrics.unpaidInvoiceCount)} />
          )}
          {metrics?.overdueInvoiceCount !== undefined && (
            <Kpi label="Hóa đơn quá hạn" value={String(metrics.overdueInvoiceCount)} tone="danger" />
          )}
        </div>
      </Widget>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))', gap: '1.25rem' }}>
        {canViewMoney && (
          <Widget
            title={revenue.data?.label ?? 'Doanh thu theo hóa đơn'}
            loading={revenue.loading}
            error={revenue.error}
            isEmpty={!revenue.data || revenueRows.length === 0}
            onRetry={revenue.reload}
            emptyMessage="Chưa có hóa đơn nào trong khoảng thời gian đã chọn."
          >
            {revenue.data && (
              <>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                  Nguồn dữ liệu: <code>{revenue.data.source}</code> — tổng {formatCurrency(revenueMaxTotal)}
                </p>
                <BarList
                  rows={revenueRows.map((point) => ({
                    key: point.period,
                    label: `${point.period} (${point.invoiceCount} hóa đơn)`,
                    value: Number(point.revenue) || 0,
                    display: formatCurrency(point.revenue),
                  }))}
                />
              </>
            )}
          </Widget>
        )}

        <Widget
          title="Tình trạng đơn hàng"
          loading={status.loading}
          error={status.error}
          isEmpty={!status.data || status.data.statuses.length === 0}
          onRetry={status.reload}
          emptyMessage="Chưa có đơn hàng nào trong khoảng thời gian đã chọn."
        >
          <BarList
            rows={(status.data?.statuses ?? []).map((entry) => ({
              key: entry.status,
              label: STATUS_LABELS[entry.status] ?? entry.status,
              value: entry.count,
              display: String(entry.count),
              color: STATUS_COLORS[entry.status] ?? '#94a3b8',
            }))}
          />
        </Widget>
      </div>

      {/* Order value is aggregate-only; the breakdown chart covers all statuses. */}
      {statusRows.length > 0 && (
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
          Tổng số đơn theo trạng thái: {statusTotal} (bao gồm đơn đã hủy).
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(22rem, 1fr))', gap: '1.25rem' }}>
        {canViewMoney && (
          <Widget
            title="Khách hàng mua nhiều nhất"
            loading={topCustomers.loading}
            error={topCustomers.error}
            isEmpty={!topCustomers.data || topCustomers.data.items.length === 0}
            onRetry={topCustomers.reload}
            emptyMessage="Chưa có đơn hàng nào để xếp hạng khách hàng."
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Khách hàng</th>
                  <th style={thStyle}>Số đơn</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Giá trị</th>
                </tr>
              </thead>
              <tbody>
                {(topCustomers.data?.items ?? []).map((item) => (
                  <tr key={item.maKhachHang}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{item.tenKhachHang}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.maKhachHangCode}</div>
                    </td>
                    <td style={tdStyle}>{item.orderCount}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(item.totalValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Widget>
        )}

        {canViewMoney && (
          <Widget
            title="Sản phẩm bán chạy"
            loading={topProducts.loading}
            error={topProducts.error}
            isEmpty={!topProducts.data || topProducts.data.items.length === 0}
            onRetry={topProducts.reload}
            emptyMessage="Chưa có chi tiết đơn hàng nào để xếp hạng sản phẩm."
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Sản phẩm</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Số lượng</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Giá trị</th>
                </tr>
              </thead>
              <tbody>
                {(topProducts.data?.items ?? []).map((item) => (
                  <tr key={item.maSanPham}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{item.tenSanPham}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.maSanPhamCode}</div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{formatQuantity(item.quantity)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(item.totalValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Widget>
        )}
      </div>

      {!canViewReceivables && (
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
          Chỉ số công nợ chi tiết được giới hạn cho quản trị viên và kế toán.
        </p>
      )}
    </div>
  );
};

const Kpi: React.FC<{ label: string; value: string; tone?: 'info' | 'danger' }> = ({ label, value, tone }) => (
  <div
    style={{
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      padding: '0.75rem',
      background: tone === 'danger' ? '#fef2f2' : tone === 'info' ? '#eff6ff' : '#f8fafc',
    }}
  >
    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{label}</div>
    <div
      style={{
        fontSize: '1.05rem',
        fontWeight: 700,
        color: tone === 'danger' ? '#b91c1c' : '#0f172a',
        overflowWrap: 'anywhere',
      }}
    >
      {value}
    </div>
  </div>
);
