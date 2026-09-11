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
import { VStack, HStack } from '@astryxdesign/core/Stack';
import { Grid } from '@astryxdesign/core/Grid';
import { Card } from '@astryxdesign/core/Card';
import { Heading, Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Selector } from '@astryxdesign/core/Selector';
import { DateInput } from '@astryxdesign/core/DateInput';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Table, proportional, pixel, type TableColumn } from '@astryxdesign/core/Table';
import { Banner } from '@astryxdesign/core/Banner';
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
    <VStack gap={3}>
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
    </VStack>
  </Card>
);

/** Horizontal bar list shared by the revenue and status widgets. */
const BarList: React.FC<{
  rows: Array<{ key: string; label: string; value: number; display: string; variant?: 'accent' | 'success' | 'warning' | 'error' | 'neutral' }>;
}> = ({ rows }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <VStack gap={3}>
      {rows.map((row) => (
        <VStack gap={1} key={row.key}>
          <HStack gap={2} hAlign="between">
            <Text type="supporting">{row.label}</Text>
            <Text type="label">{row.display}</Text>
          </HStack>
          <ProgressBar
            label={row.label}
            value={row.value}
            max={max}
            isLabelHidden
            variant={row.variant ?? 'accent'}
          />
        </VStack>
      ))}
    </VStack>
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
      <VStack gap={0}>
        <Text type="label">{item.tenKhachHang}</Text>
        <Text type="supporting">{item.maKhachHangCode}</Text>
      </VStack>
    ),
  },
  { key: 'orderCount', header: 'Số đơn', width: pixel(80), align: 'end' },
  {
    key: 'totalValue',
    header: 'Giá trị',
    width: pixel(140),
    align: 'end',
    renderCell: (item) => <Text type="label" hasTabularNumbers>{formatCurrency(item.totalValue)}</Text>,
  },
];

const productColumns: TableColumn<ProductRankRow>[] = [
  {
    key: 'tenSanPham',
    header: 'Sản phẩm',
    width: proportional(2),
    renderCell: (item) => (
      <VStack gap={0}>
        <Text type="label">{item.tenSanPham}</Text>
        <Text type="supporting">{item.maSanPhamCode}</Text>
      </VStack>
    ),
  },
  {
    key: 'quantity',
    header: 'Số lượng',
    width: pixel(90),
    align: 'end',
    renderCell: (item) => <Text hasTabularNumbers>{formatQuantity(item.quantity)}</Text>,
  },
  {
    key: 'totalValue',
    header: 'Giá trị',
    width: pixel(140),
    align: 'end',
    renderCell: (item) => <Text type="label" hasTabularNumbers>{formatCurrency(item.totalValue)}</Text>,
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
    <PageScaffold
      title="Tổng quan kinh doanh"
      subtitle="Số liệu doanh thu, tình trạng đơn hàng và công nợ bán hàng"
    >
      {/* Shared date filter — one control drives every widget. */}
      <Card>
        <HStack gap={3} vAlign="end" wrap="wrap">
          <Selector
            label="Khoảng thời gian"
            options={PERIOD_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
            value={period}
            onChange={(value) => {
              if (value && isDashboardPeriod(value)) setPeriod(value);
            }}
            width={200}
          />
          {period === 'custom' && (
            <>
              <DateInput
                label="Từ ngày"
                value={fromDate}
                onChange={setFromDate}
              />
              <DateInput
                label="Đến ngày"
                value={toDate}
                onChange={setToDate}
              />
            </>
          )}
          <Button
            label="Làm mới"
            variant="primary"
            isDisabled={customRangeIncomplete}
            onClick={refreshAll}
          />
        </HStack>
      </Card>

      {customRangeIncomplete && (
        <Banner
          status="warning"
          title="Chọn đủ ngày bắt đầu và kết thúc để xem số liệu tùy chọn."
          collapsible={false}
        />
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
        <Grid columns={{ minWidth: 176, repeat: 'fit' }} gap={3}>
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
        </Grid>
      </Widget>

      <Grid columns={{ minWidth: 320, repeat: 'fit' }} gap={5}>
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
              <VStack gap={3}>
                <Text type="supporting">
                  Nguồn dữ liệu: <Text type="code">{revenue.data.source}</Text> — tổng{' '}
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
              </VStack>
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
          <VStack gap={3}>
            {(status.data?.statuses ?? []).map((entry) => (
              <HStack key={entry.status} gap={2} hAlign="between" vAlign="center">
                <StatusBadge status={entry.status} />
                <Text type="label" hasTabularNumbers>
                  {entry.count}
                </Text>
              </HStack>
            ))}
          </VStack>
        </Widget>
      </Grid>

      {/* Order value is aggregate-only; the breakdown chart covers all statuses. */}
      {statusRows.length > 0 && (
        <Text type="supporting">
          Tổng số đơn theo trạng thái: {statusTotal} (bao gồm đơn đã hủy).
        </Text>
      )}

      <Grid columns={{ minWidth: 352, repeat: 'fit' }} gap={5}>
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
      </Grid>

      {!canViewReceivables && (
        <Text type="supporting">
          Chỉ số công nợ chi tiết được giới hạn cho quản trị viên và kế toán.
        </Text>
      )}
    </PageScaffold>
  );
};

const Kpi: React.FC<{ label: string; value: string; tone?: 'info' | 'danger' }> = ({ label, value, tone }) => (
  <Card variant={tone === 'danger' ? 'red' : tone === 'info' ? 'blue' : 'muted'} padding={3}>
    <VStack gap={1}>
      <Text type="supporting">{label}</Text>
      <Text type="label" hasTabularNumbers>
        {value}
      </Text>
    </VStack>
  </Card>
);
