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
import { Card } from '../../components/ui/Card.js';
import { Heading, Text } from '../../components/ui/Typography.js';
import { Button } from '../../components/ui/Button.js';
import { Select } from '../../components/ui/Select.js';
import { DateInput } from '../../components/ui/DateInput.js';
import type { ISODateString } from '../../components/ui/DateInput.js';
import { ProgressBar } from '../../components/ui/ProgressBar.js';
import { Table, proportional, pixel, type TableColumn } from '../../components/ui/Table.js';
import { Banner } from '../../components/ui/Banner.js';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { AsyncPanel } from '../../components/common/AsyncPanel.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
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

const PERIOD_VALUES: DashboardPeriod[] = ['month', 'quarter', 'year', 'custom'];

function isDashboardPeriod(value: string): value is DashboardPeriod {
  return (PERIOD_VALUES as string[]).includes(value);
}

/** Narrows the serialized widget params back to a typed query object. */
function parseStoredParams(serialized: string): DashboardQueryParams {
  const parsed: unknown = JSON.parse(serialized);
  if (parsed && typeof parsed === 'object' && 'period' in parsed) {
    const period = parsed.period;
    if (typeof period === 'string' && isDashboardPeriod(period)) {
      const stored = parsed as Partial<DashboardQueryParams>;
      return {
        period,
        ...(period === 'custom' ? { fromDate: stored.fromDate, toDate: stored.toDate } : {}),
        limit: stored.limit,
      };
    }
  }
  return { period: 'month', limit: 5 };
}

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

    const params = parseStoredParams(paramKey);

    fetcher(params)
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

const formatCurrency = (value: string | number | undefined): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value ?? 0) || 0);

const formatQuantity = (value: string | number | undefined): string =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(Number(value ?? 0) || 0);

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
  <Card>
    <div className="flex flex-col gap-3">
      <Heading level={3}>{title}</Heading>
      <AsyncPanel
        isLoading={loading}
        error={error}
        isEmpty={isEmpty}
        onRetry={onRetry}
        emptyTitle="Chưa có dữ liệu"
        emptyDescription={emptyMessage}
      >
        {children}
      </AsyncPanel>
    </div>
  </Card>
);

/** Horizontal bar list shared by the revenue and status widgets. */
const BarList: React.FC<{
  rows: Array<{
    key: string;
    label: string;
    value: number;
    display: string;
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  }>;
}> = ({ rows }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div className="flex flex-col gap-1" key={row.key}>
          <div className="flex flex-row justify-between gap-2">
            <Text variant="supporting">{row.label}</Text>
            <Text variant="label">{row.display}</Text>
          </div>
          <ProgressBar
            label={row.label}
            value={row.value}
            max={max}
            isLabelHidden
            variant={row.variant ?? 'primary'}
          />
        </div>
      ))}
    </div>
  );
};

interface CustomerRankRow extends Record<string, unknown> {
  maKhachHang: number;
  maKhachHangCode: string;
  tenKhachHang: string;
  orderCount: number;
  totalValue: string;
}

interface ProductRankRow extends Record<string, unknown> {
  maSanPham: number;
  maSanPhamCode: string;
  tenSanPham: string;
  quantity: string | number;
  totalValue: string;
}

const customerColumns: TableColumn<CustomerRankRow>[] = [
  {
    key: 'tenKhachHang',
    header: 'Khách hàng',
    width: proportional(2),
    renderCell: (item) => (
      <div className="flex flex-col">
        <Text variant="label">{item.tenKhachHang}</Text>
        <Text variant="supporting">{item.maKhachHangCode}</Text>
      </div>
    ),
  },
  { key: 'orderCount', header: 'Số đơn', width: pixel(80), align: 'end' },
  {
    key: 'totalValue',
    header: 'Giá trị',
    width: pixel(140),
    align: 'end',
    renderCell: (item) => (
      <Text variant="label" className="tabular-nums">
        {formatCurrency(item.totalValue)}
      </Text>
    ),
  },
];

const productColumns: TableColumn<ProductRankRow>[] = [
  {
    key: 'tenSanPham',
    header: 'Sản phẩm',
    width: proportional(2),
    renderCell: (item) => (
      <div className="flex flex-col">
        <Text variant="label">{item.tenSanPham}</Text>
        <Text variant="supporting">{item.maSanPhamCode}</Text>
      </div>
    ),
  },
  {
    key: 'quantity',
    header: 'Số lượng',
    width: pixel(90),
    align: 'end',
    renderCell: (item) => <Text className="tabular-nums">{formatQuantity(item.quantity)}</Text>,
  },
  {
    key: 'totalValue',
    header: 'Giá trị',
    width: pixel(140),
    align: 'end',
    renderCell: (item) => (
      <Text variant="label" className="tabular-nums">
        {formatCurrency(item.totalValue)}
      </Text>
    ),
  },
];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.vai_tro ?? '';

  // `kho` is denied the three money endpoints (roles-permissions §3.2), so the
  // client must not issue those requests at all.
  const canViewMoney = role === 'admin' || role === 'ban_hang' || role === 'ke_toan';
  const canViewReceivables = role === 'admin' || role === 'ke_toan';

  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [fromDate, setFromDate] = useState<ISODateString | undefined>(undefined);
  const [toDate, setToDate] = useState<ISODateString | undefined>(undefined);

  const customRangeIncomplete = period === 'custom' && (!fromDate || !toDate);

  const params: DashboardQueryParams = {
    period,
    ...(period === 'custom' ? { fromDate, toDate } : {}),
    limit: 5,
  };

  // A custom period without both dates is rejected by the API, so every widget
  // waits for the range the "Làm mới" button already requires.
  const widgetsEnabled = !customRangeIncomplete;

  const summary = useWidget<DashboardSummary>(getDashboardSummary, params, widgetsEnabled);
  const status = useWidget<OrderStatusBreakdown>(getOrderStatus, params, widgetsEnabled);
  const revenue = useWidget<RevenueChart>(getRevenueChart, params, widgetsEnabled && canViewMoney);
  const topCustomers = useWidget<TopCustomers>(getTopCustomers, params, widgetsEnabled && canViewMoney);
  const topProducts = useWidget<TopProducts>(getTopProducts, params, widgetsEnabled && canViewMoney);

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
    <PageScaffold
      title="Tổng quan kinh doanh"
      subtitle="Số liệu doanh thu, tình trạng đơn hàng và công nợ bán hàng"
    >
      {/* Shared date filter — one control drives every widget. */}
      <Card>
        <div className="flex flex-row flex-wrap items-end gap-3">
          <Select
            label="Khoảng thời gian"
            options={PERIOD_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            value={period}
            onChange={(value) => {
              if (value && isDashboardPeriod(value)) setPeriod(value);
            }}
            className="w-50"
          />
          {period === 'custom' && (
            <>
              <DateInput label="Từ ngày" value={fromDate} onChange={setFromDate} />
              <DateInput label="Đến ngày" value={toDate} onChange={setToDate} />
            </>
          )}
          <Button variant="primary" disabled={customRangeIncomplete} onClick={refreshAll}>
            Làm mới
          </Button>
        </div>
      </Card>

      {customRangeIncomplete && (
        <Banner status="warning" title="Chọn đủ ngày bắt đầu và kết thúc để xem số liệu tùy chọn." />
      )}

      {/* KPI cards — role-scoped by the server; absent metrics are simply not rendered. */}
      <Widget
        title="Chỉ số chính"
        loading={summary.loading}
        error={summary.error}
        isEmpty={!summary.data}
        onRetry={summary.reload}
        emptyMessage="Chưa có số liệu trong khoảng thời gian đã chọn."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
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
              <div className="flex flex-col gap-3">
                <Text variant="supporting">
                  Nguồn dữ liệu: <Text variant="code">{revenue.data.source}</Text> — tổng{' '}
                  {formatCurrency(revenueMaxTotal)}
                </Text>
                <BarList
                  rows={revenueRows.map((point) => ({
                    key: point.period,
                    label: `${point.period} (${point.invoiceCount} hóa đơn)`,
                    value: Number(point.revenue) || 0,
                    display: formatCurrency(point.revenue),
                  }))}
                />
              </div>
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
          <div className="flex flex-col gap-3">
            {(status.data?.statuses ?? []).map((entry) => (
              <div key={entry.status} className="flex flex-row items-center justify-between gap-2">
                <StatusBadge status={entry.status} />
                <Text variant="label" className="tabular-nums">
                  {entry.count}
                </Text>
              </div>
            ))}
          </div>
        </Widget>
      </div>

      {/* Order value is aggregate-only; the breakdown chart covers all statuses. */}
      {statusRows.length > 0 && (
        <Text variant="supporting">
          Tổng số đơn theo trạng thái: {statusTotal} (bao gồm đơn đã hủy).
        </Text>
      )}

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(352px,1fr))]">
        {canViewMoney && (
          <Widget
            title="Khách hàng mua nhiều nhất"
            loading={topCustomers.loading}
            error={topCustomers.error}
            isEmpty={!topCustomers.data || topCustomers.data.items.length === 0}
            onRetry={topCustomers.reload}
            emptyMessage="Chưa có đơn hàng nào để xếp hạng khách hàng."
          >
            <Table<CustomerRankRow>
              data={(topCustomers.data?.items ?? []).map((item) => ({
                maKhachHang: item.maKhachHang,
                maKhachHangCode: item.maKhachHangCode,
                tenKhachHang: item.tenKhachHang,
                orderCount: item.orderCount,
                totalValue: item.totalValue,
              }))}
              columns={customerColumns}
              idKey="maKhachHang"
              density="compact"
            />
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
            <Table<ProductRankRow>
              data={(topProducts.data?.items ?? []).map((item) => ({
                maSanPham: item.maSanPham,
                maSanPhamCode: item.maSanPhamCode,
                tenSanPham: item.tenSanPham,
                quantity: item.quantity,
                totalValue: item.totalValue,
              }))}
              columns={productColumns}
              idKey="maSanPham"
              density="compact"
            />
          </Widget>
        )}
      </div>

      {!canViewReceivables && (
        <Text variant="supporting">
          Chỉ số công nợ chi tiết được giới hạn cho quản trị viên và kế toán.
        </Text>
      )}
    </PageScaffold>
  );
};

const Kpi: React.FC<{ label: string; value: string; tone?: 'info' | 'danger' }> = ({ label, value, tone }) => (
  <Card variant={tone === 'danger' ? 'red' : tone === 'info' ? 'blue' : 'muted'} className="p-3">
    <div className="flex flex-col gap-1">
      <Text variant="supporting">{label}</Text>
      <Text variant="label" className="tabular-nums">
        {value}
      </Text>
    </div>
  </Card>
);
