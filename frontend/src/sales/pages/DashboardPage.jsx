import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CircleDollarSign,
  ClipboardList,
  Clock,
  ReceiptText,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import {
  getOrderStatus,
  getOverviewSummary,
  getRevenueChart,
  getTopCustomers,
  getTopProducts,
} from '../services/overviewService.js';
import { Card } from '../components/ui/Card.jsx';
import { Heading, Text } from '../components/ui/Typography.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Select } from '../components/ui/Select.jsx';
import { DateInput } from '../components/ui/DateInput.jsx';
import { ProgressBar } from '../components/ui/ProgressBar.jsx';
import { Table, pixel, proportional } from '../components/ui/Table.jsx';
import { Banner } from '../components/ui/Banner.jsx';
import { TextLink } from '../components/ui/TextLink.jsx';
import { PageScaffold } from '../components/common/PageScaffold.jsx';
import { AsyncPanel } from '../components/common/AsyncPanel.jsx';
import { statusLabel } from '../components/common/StatusBadge.jsx';
import { CategoryBarChart, CategoryBarChartSkeleton } from '../components/charts/CategoryBarChart.jsx';
import { TrendChart, TrendChartSkeleton } from '../components/charts/TrendChart.jsx';
import { statusColor } from '../components/charts/chartTheme.js';
import { KpiCard, KpiCardSkeleton } from '../components/dashboard/KpiCard.jsx';
import { FINANCE_ROLES, MONEY_METRIC_ROLES, hasAnyRole } from '../config/permissions.js';
import {
  formatClock,
  formatCount,
  formatCurrency,
  formatCurrencyCompact,
  formatMonthLabel,
  formatQuantity,
} from '../lib/format.js';
import { cn } from '../lib/cn.js';
import { useAuth } from '../../components/rbac/AuthContext.jsx';

/**
 * Sales overview (PH1 \`pages/dashboard/DashboardPage.tsx\`, ported 1:1 for Step 6H).
 *
 * Role scoping is enforced server-side; the client additionally avoids *calling*
 * endpoints the role is denied (\`kho\` on the three money endpoints) so a
 * legitimate page load never produces a 403, and it renders a KPI only when the
 * server actually serialized its metric.
 *
 * "Revenue" is the invoice-based metric only; order money is always labelled
 * "giá trị đơn hàng" (docs/architecture/dashboard-metrics.md §1).
 *
 * Core adaptations: the module's service is \`overviewService.js\` (\`getOverviewSummary\`
 * here is PH1's \`getDashboardSummary\`), \`useAuth\` comes from Core's RBAC context, and every
 * in-module link is rewritten under Core's \`/sales\` mount point.
 */

const PERIOD_VALUES = ['month', 'quarter', 'year', 'custom'];

function isDashboardPeriod(value) {
  return PERIOD_VALUES.includes(value);
}

/** Narrows the serialized widget params back to a query object. */
function parseStoredParams(serialized) {
  const parsed = JSON.parse(serialized);
  if (parsed && typeof parsed === 'object' && 'period' in parsed) {
    const period = parsed.period;
    if (typeof period === 'string' && isDashboardPeriod(period)) {
      return {
        period,
        ...(period === 'custom' ? { fromDate: parsed.fromDate, toDate: parsed.toDate } : {}),
        limit: parsed.limit,
      };
    }
  }
  return { period: 'month', limit: 5 };
}

/** One independent widget request. Each call site gets its own state slot. */
function useWidget(fetcher, params, enabled) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // Serialized so the effect depends on values, not on a fresh object identity
  // each render (which would re-fetch forever).
  const paramKey = JSON.stringify(params);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = parseStoredParams(paramKey);

    fetcher(params)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không tải được số liệu.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // \`fetcher\` is a stable module-level function at every call site.
  }, [paramKey, enabled, nonce]);

  return { data, loading, error, reload };
}

/** Window label per preset, shared by the filter options and the KPI caption. */
const PERIOD_LABEL = {
  month: 'Tháng này',
  quarter: 'Quý này',
  year: 'Năm nay',
  custom: 'Tùy chọn',
};

const PERIOD_OPTIONS = PERIOD_VALUES.map((value) => ({ value, label: PERIOD_LABEL[value] }));

/**
 * One column definition for the six tiles: \`sm\` pairs them, \`lg\` gives the row
 * three across, and the grid never goes wider than three so a full VND figure
 * and its label stay on one line.
 */
const KPI_GRID_CLASS = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';

/** Six tiles: the grid keeps its height while the summary loads. */
const KPI_SKELETON = (
  <div className={KPI_GRID_CLASS}>
    {Array.from({ length: 6 }, (_, index) => (
      <KpiCardSkeleton key={index} />
    ))}
  </div>
);

function SectionHeading({ title, supporting }) {
  return (
    <div className="flex flex-col gap-1">
      <Heading level={3}>{title}</Heading>
      {supporting ? (
        <Text variant="supporting" as="p">
          {supporting}
        </Text>
      ) : null}
    </div>
  );
}

/**
 * Widget boundary for the chart and ranking cards. Each widget owns its own
 * request, loading, error and empty state, so one failing request never blanks
 * a page that still has other data.
 *
 * \`min-w-0\` matters on narrow screens: without it the grid track refuses to
 * shrink below the table's min-content width, and a ranking table pushes the
 * whole page wider instead of scrolling inside its own card.
 */
function Widget({
  title,
  description,
  action,
  loading,
  error,
  isEmpty,
  onRetry,
  emptyMessage,
  skeleton,
  className,
  children,
}) {
  return (
    <Card className={cn('flex min-w-0 flex-col gap-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Heading level={3}>{title}</Heading>
          {description ? (
            <Text variant="supporting" as="p">
              {description}
            </Text>
          ) : null}
        </div>
        {action}
      </div>
      <AsyncPanel
        isLoading={loading}
        error={error}
        isEmpty={isEmpty}
        onRetry={onRetry}
        emptyTitle="Chưa có dữ liệu"
        emptyDescription={emptyMessage}
        skeleton={skeleton}
      >
        {children}
      </AsyncPanel>
    </Card>
  );
}

/** \`maxTotalValue\` is the largest value in the current result set, floored at 1. */
const customerColumns = (maxTotalValue) => [
  {
    key: 'rank',
    header: '#',
    width: pixel(44),
    renderCell: (_row, rowIndex) => (
      <Text variant="supporting" className="tabular-nums">
        {rowIndex + 1}
      </Text>
    ),
  },
  {
    key: 'tenKhachHang',
    header: 'Khách hàng',
    width: proportional(2, { minWidth: 150 }),
    // The name cell must be allowed to wrap: a long name kept on one line makes
    // the table wider than the card and clips the money column beside it.
    renderCell: (item) => (
      <TextLink
        to={'/sales/customers/' + item.maKhachHang}
        className="flex min-w-0 flex-col gap-0.5 whitespace-normal"
      >
        <Text variant="label">{item.tenKhachHang}</Text>
        <Text variant="supporting">
          {item.maKhachHangCode + ' · ' + formatCount(item.orderCount) + ' đơn'}
        </Text>
      </TextLink>
    ),
  },
  {
    key: 'totalValue',
    header: 'Giá trị',
    width: proportional(1, { minWidth: 128 }),
    align: 'end',
    renderCell: (item) => {
      const totalValue = Number(item.totalValue) || 0;
      return (
        <div className="flex flex-col">
          <Text variant="label" className="tabular-nums whitespace-nowrap">
            {formatCurrency(item.totalValue)}
          </Text>
          <ProgressBar
            label={item.tenKhachHang + ': ' + Math.round((totalValue / maxTotalValue) * 100) + '% so với khách hàng dẫn đầu'}
            value={totalValue}
            max={maxTotalValue}
            isLabelHidden
            variant="primary"
            className="mt-1"
          />
        </div>
      );
    },
  },
];

/** \`maxTotalValue\` is the largest value in the current result set. */
const productColumns = (maxTotalValue) => [
  {
    key: 'rank',
    header: '#',
    width: pixel(44),
    renderCell: (_row, rowIndex) => (
      <Text variant="supporting" className="tabular-nums">
        {rowIndex + 1}
      </Text>
    ),
  },
  {
    key: 'tenSanPham',
    header: 'Sản phẩm',
    width: proportional(2, { minWidth: 150 }),
    // The name cell must be allowed to wrap: a long name kept on one line makes
    // the table wider than the card and clips the money column beside it.
    renderCell: (item) => (
      <div className="flex min-w-0 flex-col gap-0.5 whitespace-normal">
        <Text variant="label">{item.tenSanPham}</Text>
        <Text variant="supporting">
          {item.maSanPhamCode + ' · ' + formatQuantity(item.quantity)}
        </Text>
      </div>
    ),
  },
  {
    key: 'totalValue',
    header: 'Giá trị',
    width: proportional(1, { minWidth: 128 }),
    align: 'end',
    renderCell: (item) => {
      const totalValue = Number(item.totalValue) || 0;
      return (
        <div className="flex flex-col">
          <Text variant="label" className="tabular-nums whitespace-nowrap">
            {formatCurrency(item.totalValue)}
          </Text>
          <ProgressBar
            label={item.tenSanPham + ': ' + Math.round((totalValue / maxTotalValue) * 100) + '% so với sản phẩm dẫn đầu'}
            value={totalValue}
            max={maxTotalValue}
            isLabelHidden
            variant="primary"
            className="mt-1"
          />
        </div>
      );
    },
  },
];

export function DashboardPage() {
  const { user } = useAuth();

  // `kho` is denied the three money endpoints (roles-permissions §3.2), so the
  // client must not issue those requests at all.
  const canViewMoney = hasAnyRole(user, MONEY_METRIC_ROLES);
  const canViewReceivables = hasAnyRole(user, FINANCE_ROLES);

  const [period, setPeriod] = useState('month');
  const [fromDate, setFromDate] = useState(undefined);
  const [toDate, setToDate] = useState(undefined);
  const [lastUpdated, setLastUpdated] = useState(null);

  const customRangeIncomplete = period === 'custom' && (!fromDate || !toDate);

  const params = {
    period,
    ...(period === 'custom' ? { fromDate, toDate } : {}),
    limit: 5,
  };

  // A custom period without both dates is rejected by the API, so every widget
  // waits for a complete range instead of guessing one.
  const widgetsEnabled = !customRangeIncomplete;

  const summary = useWidget(getOverviewSummary, params, widgetsEnabled);
  const status = useWidget(getOrderStatus, params, widgetsEnabled);
  const revenue = useWidget(getRevenueChart, params, widgetsEnabled && canViewMoney);
  const topCustomers = useWidget(getTopCustomers, params, widgetsEnabled && canViewMoney);
  const topProducts = useWidget(getTopProducts, params, widgetsEnabled && canViewMoney);

  const refreshAll = () => {
    summary.reload();
    status.reload();
    if (canViewMoney) {
      revenue.reload();
      topCustomers.reload();
      topProducts.reload();
    }
  };

  // Any in-flight widget means the page is not up to date yet. Widgets the role
  // may not call stay \`loading: false\`, so they never hold the stamp back.
  const isRefreshing =
    summary.loading || status.loading || revenue.loading || topCustomers.loading || topProducts.loading;

  useEffect(() => {
    if (!widgetsEnabled) {
      setLastUpdated(null);
      return;
    }
    if (!isRefreshing) setLastUpdated(new Date());
  }, [widgetsEnabled, isRefreshing]);

  const metrics = summary.data && summary.data.metrics;
  const customerItems = (topCustomers.data && topCustomers.data.items) || [];
  const productItems = (topProducts.data && topProducts.data.items) || [];
  const maxCustomerValue = Math.max(1, ...customerItems.map((item) => Number(item.totalValue) || 0));
  const maxProductValue = Math.max(1, ...productItems.map((item) => Number(item.totalValue) || 0));

  return (
    <PageScaffold
      title="Tổng quan kinh doanh"
      subtitle="Số liệu doanh thu, tình trạng đơn hàng và công nợ bán hàng"
    >
      {/* One filter drives every widget; the period change refetches by itself,
          so the button is only an explicit re-run of the same queries. */}
      <Card className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div
            role="group"
            aria-label="Bộ lọc thời gian"
            className="flex w-full flex-wrap items-end gap-3 sm:w-auto"
          >
            <Select
              label="Khoảng thời gian"
              options={PERIOD_OPTIONS}
              value={period}
              onChange={(value) => {
                if (value && isDashboardPeriod(value)) setPeriod(value);
              }}
              className="w-full sm:w-48"
            />
            {period === 'custom' && (
              <>
                <DateInput label="Từ ngày" value={fromDate} onChange={setFromDate} className="w-full sm:w-48" />
                <DateInput label="Đến ngày" value={toDate} onChange={setToDate} className="w-full sm:w-48" />
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {lastUpdated && !isRefreshing ? (
              <Text variant="supporting">Cập nhật lúc {formatClock(lastUpdated)}</Text>
            ) : null}
            <Button
              variant="secondary"
              icon={<RefreshCw size={16} />}
              loading={isRefreshing}
              disabled={customRangeIncomplete}
              onClick={refreshAll}
            >
              Làm mới
            </Button>
          </div>
        </div>
        {customRangeIncomplete && (
          <Banner status="warning" title="Chọn đủ ngày bắt đầu và kết thúc để xem số liệu tùy chọn." />
        )}
      </Card>

      <section aria-label="Chỉ số chính" className="flex flex-col gap-4">
        <SectionHeading
          title="Chỉ số chính"
          supporting={
            'Số liệu trong ' +
            PERIOD_LABEL[period] +
            (period === 'custom' && fromDate && toDate ? ' từ ' + fromDate + ' đến ' + toDate : '')
          }
        />
        <AsyncPanel
          isLoading={summary.loading}
          error={summary.error}
          onRetry={summary.reload}
          isEmpty={!summary.data}
          emptyTitle="Chưa có dữ liệu"
          emptyDescription="Chưa có số liệu trong khoảng thời gian đã chọn."
          skeleton={KPI_SKELETON}
        >
          <div className={KPI_GRID_CLASS}>
            {metrics && metrics.orderCount !== undefined && (
              <KpiCard
                label="Tổng số đơn"
                value={formatCount(metrics.orderCount)}
                icon={ClipboardList}
                tone="primary"
                hint="Bao gồm cả đơn đã hủy"
              />
            )}
            {metrics && metrics.totalOrderValue !== undefined && (
              <KpiCard
                label="Giá trị đơn hàng"
                value={formatCurrency(metrics.totalOrderValue)}
                icon={Wallet}
                tone="info"
                hint="Không gồm đơn đã hủy"
              />
            )}
            {metrics && metrics.openReceivable !== undefined && (
              <KpiCard
                label="Công nợ phải thu"
                value={formatCurrency(metrics.openReceivable)}
                icon={CircleDollarSign}
                tone="violet"
                hint="Toàn bộ số công nợ phải thu, không theo kỳ đã chọn"
              />
            )}
            {metrics && metrics.overdueReceivable !== undefined && (
              <KpiCard
                label="Công nợ quá hạn"
                value={formatCurrency(metrics.overdueReceivable)}
                icon={AlertTriangle}
                tone="danger"
              />
            )}
            {metrics && metrics.unpaidInvoiceCount !== undefined && (
              <KpiCard
                label="Hóa đơn chưa thu đủ"
                value={formatCount(metrics.unpaidInvoiceCount)}
                icon={ReceiptText}
                tone="warning"
                hint="Số lượng hóa đơn, không phải số tiền"
              />
            )}
            {metrics && metrics.overdueInvoiceCount !== undefined && (
              <KpiCard
                label="Hóa đơn quá hạn"
                value={formatCount(metrics.overdueInvoiceCount)}
                icon={Clock}
                tone="danger"
                hint="Đã qua ngày đáo hạn"
              />
            )}
          </div>
        </AsyncPanel>
      </section>

      {/* The status breakdown is readable by every role, so only the
          invoice-based revenue card is gated by money permission; without it
          the grid collapses to one full-width card instead of two empty
          columns. */}
      <section aria-label="Hiệu suất bán hàng" className="flex flex-col gap-4">
        <SectionHeading title="Hiệu suất bán hàng" />
        <div className={canViewMoney ? 'grid gap-5 xl:grid-cols-3' : 'grid gap-5'}>
          {canViewMoney && (
            <Widget
              className="xl:col-span-2"
              title={(revenue.data && revenue.data.label) || 'Doanh thu theo hóa đơn'}
              description={
                revenue.data ? (
                  <>
                    Nguồn dữ liệu: <Text variant="code">{revenue.data.source}</Text>
                  </>
                ) : null
              }
              action={
                revenue.data ? (
                  <div className="flex flex-col items-end">
                    <Text variant="supporting">Tổng theo kỳ</Text>
                    <Text className="font-medium tabular-nums">{formatCurrency(revenue.data.total)}</Text>
                  </div>
                ) : null
              }
              loading={revenue.loading}
              error={revenue.error}
              isEmpty={!revenue.data || revenue.data.series.length === 0}
              onRetry={revenue.reload}
              emptyMessage="Chưa có hóa đơn nào trong khoảng thời gian đã chọn."
              skeleton={<TrendChartSkeleton height={260} />}
            >
              {revenue.data ? (
                <TrendChart
                  points={revenue.data.series.map((point) => ({
                    key: point.period,
                    label: formatMonthLabel(point.period),
                    value: Number(point.revenue) || 0,
                    caption: formatCount(point.invoiceCount) + ' hóa đơn',
                  }))}
                  formatValue={formatCurrency}
                  formatAxis={formatCurrencyCompact}
                  ariaLabel={revenue.data.label}
                  seriesLabel="Doanh thu"
                  height={260}
                />
              ) : null}
            </Widget>
          )}
          <Widget
            title="Tình trạng đơn hàng"
            description="Số đơn theo từng trạng thái, bao gồm đơn đã hủy"
            action={
              status.data ? (
                <div className="flex flex-col items-end">
                  <Text variant="supporting">Tổng số đơn</Text>
                  <Text className="font-medium tabular-nums">{formatCount(status.data.total)} đơn</Text>
                </div>
              ) : null
            }
            loading={status.loading}
            error={status.error}
            isEmpty={!status.data || status.data.statuses.length === 0}
            onRetry={status.reload}
            emptyMessage="Chưa có đơn hàng nào trong khoảng thời gian đã chọn."
            skeleton={<CategoryBarChartSkeleton height={220} />}
          >
            {status.data ? (
              <CategoryBarChart
                points={status.data.statuses.map((entry) => ({
                  key: entry.status,
                  label: statusLabel(entry.status),
                  value: entry.count,
                  color: statusColor(entry.status),
                }))}
                formatValue={formatCount}
                formatAxis={formatCount}
                ariaLabel="Tình trạng đơn hàng"
                valueSuffix="đơn"
                showShare
                height={220}
              />
            ) : null}
          </Widget>
        </div>
      </section>

      {canViewMoney && (
        <section aria-label="Xếp hạng" className="flex flex-col gap-4">
          <SectionHeading title="Xếp hạng" />
          <div className="grid gap-5 xl:grid-cols-2">
            <Widget
              title="Khách hàng mua nhiều nhất"
              description="Xếp hạng theo tổng giá trị đơn hàng, không gồm đơn đã hủy"
              action={
                <TextLink to="/sales/customers" weight="medium">
                  Xem tất cả
                </TextLink>
              }
              loading={topCustomers.loading}
              error={topCustomers.error}
              isEmpty={customerItems.length === 0}
              onRetry={topCustomers.reload}
              emptyMessage="Chưa có đơn hàng nào để xếp hạng khách hàng."
            >
              <Table
                data={customerItems}
                columns={customerColumns(maxCustomerValue)}
                idKey="maKhachHang"
                label="Khách hàng mua nhiều nhất"
                density="balanced"
              />
            </Widget>
            <Widget
              title="Sản phẩm bán chạy"
              description="Xếp hạng theo thành tiền chi tiết đơn hàng, không gồm đơn đã hủy"
              action={
                <TextLink to="/sales/products" weight="medium">
                  Xem tất cả
                </TextLink>
              }
              loading={topProducts.loading}
              error={topProducts.error}
              isEmpty={productItems.length === 0}
              onRetry={topProducts.reload}
              emptyMessage="Chưa có chi tiết đơn hàng nào để xếp hạng sản phẩm."
            >
              <Table
                data={productItems}
                columns={productColumns(maxProductValue)}
                idKey="maSanPham"
                label="Sản phẩm bán chạy"
                density="balanced"
              />
            </Widget>
          </div>
        </section>
      )}

      {!canViewReceivables && (
        <Text variant="supporting" as="p">
          Chỉ số công nợ chi tiết được giới hạn cho quản trị viên và kế toán.
        </Text>
      )}
      {!canViewMoney && (
        <Text variant="supporting" as="p">
          Tài khoản kho chỉ xem được số đơn và tình trạng đơn hàng; số liệu doanh thu và công nợ
          được ẩn theo phân quyền.
        </Text>
      )}
    </PageScaffold>
  );
}
