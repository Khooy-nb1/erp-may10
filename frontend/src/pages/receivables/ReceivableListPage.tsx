import React, { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Text, Heading } from '../../components/ui/Typography.js';
import { Banner } from '../../components/ui/Banner.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Checkbox } from '../../components/ui/Checkbox.js';
import { Select } from '../../components/ui/Select.js';
import { proportional, pixel, type TableColumn } from '../../components/ui/Table.js';
import { Receivable, ReceivableStatus, ReceivableSummary, AgingReport, AgingBucket } from '../../types/receivable.js';
import { getReceivables, getReceivableSummary, getAgingReport } from '../../services/receivableService.js';
import { formatCurrency, formatDate } from '../../lib/format.js';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { DataTableCard } from '../../components/common/DataTableCard.js';
import { FilterBar } from '../../components/common/FilterBar.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { useAuth } from '../../context/AuthContext.js';

type SortColumn = 'ngay_dao_han' | 'so_tien_con_lai';

/**
 * Columns this screen reads off `Receivable`. Declared as an object type alias so
 * the API payload can be handed to the table as-is, without re-mapping rows.
 */
type ReceivableRow = {
  id: number;
  ma_khach_hang: number;
  ten_khach_hang?: string;
  ma_khach_hang_code?: string;
  ma_hoa_don_code?: string;
  so_tien_phat_sinh: number | string;
  so_tien_da_thanh_toan: number | string;
  so_tien_con_lai: number | string;
  ngay_dao_han: string;
  daysOverdue?: number;
  trang_thai: ReceivableStatus;
};

/** One row of the aging report: a bucket, plus the report's total row. */
type AgingRow = {
  id: string;
  label: string;
  count: number;
  totalAmount: string;
  isTotal: boolean;
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'chua_thanh_toan', label: 'Chưa thanh toán' },
  { value: 'mot_phan', label: 'Thanh toán một phần' },
  { value: 'da_thanh_toan', label: 'Đã thanh toán' },
  { value: 'qua_han', label: 'Quá hạn' },
];

const agingColumns: TableColumn<AgingRow>[] = [
  {
    key: 'label',
    header: 'Nhóm tuổi nợ',
    width: proportional(2),
    renderCell: (item) => <Text className={item.isTotal ? 'font-bold' : undefined}>{item.label}</Text>,
  },
  {
    key: 'count',
    header: 'Số khoản',
    width: pixel(120),
    align: 'center',
    renderCell: (item) => (
      <Text className={item.isTotal ? 'font-bold tabular-nums' : 'tabular-nums'}>
        {item.count}
      </Text>
    ),
  },
  {
    key: 'totalAmount',
    header: 'Tiền còn phải thu',
    width: pixel(200),
    align: 'end',
    renderCell: (item) => (
      <Text className={item.isTotal ? 'font-bold tabular-nums' : 'font-semibold tabular-nums'}>
        {formatCurrency(item.totalAmount)}
      </Text>
    ),
  },
];

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
  // The search term is submit-triggered, so it is not an effect dependency;
  // this token lets "Xóa bộ lọc" refetch when it cleared the search alone.
  const [reloadToken, setReloadToken] = useState<number>(0);

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
  }, [page, trangThai, overdueOnly, sortBy, sortOrder, reloadToken]);

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

  const isFiltered = Boolean(search.trim() || trangThai || overdueOnly);

  const handleSort = (column: SortColumn) => {
    setPage(1);
    if (sortBy === column) {
      setSortOrder((order) => (order === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortOrder(column === 'ngay_dao_han' ? 'ASC' : 'DESC');
    }
  };

  /**
   * Sortable header: clicking it toggles the server-side sort exactly like the
   * old header button did. The arrow icon shows the active direction and the
   * accessible name carries it too, so the sort state is not colour-only.
   */
  const renderSortHeader = (column: SortColumn, label: string, tooltip: string) => (
    <Button
      aria-label={sortBy === column ? `${label} (sắp xếp ${sortOrder === 'ASC' ? 'tăng dần' : 'giảm dần'})` : label}
      variant="ghost"
      size="sm"
      icon={
        sortBy === column ? sortOrder === 'ASC' ? <ArrowUp size={14} /> : <ArrowDown size={14} /> : undefined
      }
      title={tooltip}
      onClick={() => handleSort(column)}
    >
      {label}
    </Button>
  );

  const columns: TableColumn<ReceivableRow>[] = [
    {
      key: 'khach_hang',
      header: 'Khách hàng',
      width: proportional(2),
      renderCell: (item) => (
        <div className="flex flex-col gap-0.5">
          <span className="block max-w-[280px] truncate" title={item.ten_khach_hang}>
            <Text className="font-medium">{item.ten_khach_hang || `Mã #${item.ma_khach_hang}`}</Text>
          </span>
          {item.ma_khach_hang_code ? (
            <Text variant="code" className="text-muted-foreground">
              {item.ma_khach_hang_code}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      key: 'ma_hoa_don_code',
      header: 'Hóa đơn',
      width: proportional(1),
      renderCell: (item) => (
        <Text variant="code" className="font-semibold">
          {item.ma_hoa_don_code || '—'}
        </Text>
      ),
    },
    {
      key: 'so_tien_phat_sinh',
      header: 'Phát sinh',
      width: pixel(160),
      align: 'end',
      renderCell: (item) => <Text className="tabular-nums">{formatCurrency(item.so_tien_phat_sinh)}</Text>,
    },
    {
      key: 'so_tien_da_thanh_toan',
      header: 'Đã thanh toán',
      width: pixel(160),
      align: 'end',
      renderCell: (item) => (
        <Text className="tabular-nums">{formatCurrency(item.so_tien_da_thanh_toan)}</Text>
      ),
    },
    {
      key: 'so_tien_con_lai',
      header: renderSortHeader('so_tien_con_lai', 'Còn lại', 'Sắp xếp theo số tiền còn lại'),
      width: pixel(160),
      align: 'end',
      renderCell: (item) => (
        <Text className="font-bold tabular-nums">
          {formatCurrency(item.so_tien_con_lai)}
        </Text>
      ),
    },
    {
      key: 'ngay_dao_han',
      header: renderSortHeader('ngay_dao_han', 'Ngày đáo hạn', 'Sắp xếp theo ngày đáo hạn'),
      width: pixel(170),
      renderCell: (item) => <Text variant="supporting">{formatDate(item.ngay_dao_han)}</Text>,
    },
    {
      key: 'days_overdue',
      header: 'Số ngày quá hạn',
      width: pixel(160),
      renderCell: (item) => {
        const daysOverdue = Number(item.daysOverdue) || 0;
        return daysOverdue > 0 ? (
          <Text className="font-semibold text-danger-strong">Quá hạn {daysOverdue} ngày</Text>
        ) : (
          <Text className="text-muted-foreground">—</Text>
        );
      },
    },
    {
      key: 'trang_thai',
      header: 'Trạng thái',
      width: pixel(150),
      align: 'start',
      renderCell: (item) => <StatusBadge status={item.trang_thai} />,
    },
  ];

  const agingBuckets: AgingBucket[] = aging
    ? [aging.current, aging.days1To30, aging.days31To60, aging.days61To90, aging.daysOver90]
    : [];
  const agingCountTotal = agingBuckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const agingRows: AgingRow[] = aging
    ? [
        ...agingBuckets.map((bucket) => ({
          id: bucket.label,
          label: bucket.label,
          count: bucket.count,
          totalAmount: bucket.totalAmount,
          isTotal: false,
        })),
        {
          id: 'tong-cong',
          label: 'Tổng cộng',
          count: agingCountTotal,
          totalAmount: aging.totalReceivables,
          isTotal: true,
        },
      ]
    : [];

  return (
    <PageScaffold
      title="Công nợ phải thu"
      subtitle={`Công nợ phải thu khách hàng, chỉ đọc trong phân hệ Bán hàng (${total} khoản)`}
    >
      {/* Read-only Notice */}
      <Banner
        status="info"
        title="Phân hệ Bán hàng chỉ đọc dữ liệu công nợ. Ghi nhận thanh toán thuộc trách nhiệm Kế toán."
      />

      {/* Overview Error */}
      {overviewError && (
        <Banner
          status="error"
          title={`Không thể tải đầy đủ số liệu tổng quan: ${overviewError}`}
          endContent={<Button variant="secondary" size="sm" onClick={fetchOverview}>Thử lại</Button>}
        />
      )}

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex flex-col gap-1">
              <Text variant="supporting">Tổng phát sinh</Text>
              <Text variant="large" className="font-semibold tabular-nums">
                {formatCurrency(summary.totalOriginal)}
              </Text>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex flex-col gap-1">
              <Text variant="supporting">Đã thu</Text>
              <Text variant="large" className="font-semibold tabular-nums">
                {formatCurrency(summary.totalPaid)}
              </Text>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex flex-col gap-1">
              <Text variant="supporting">Còn phải thu</Text>
              <Text variant="large" className="font-semibold tabular-nums">
                {formatCurrency(summary.totalOutstanding)}
              </Text>
            </div>
          </Card>
          <Card variant={Number(summary.totalOverdue) > 0 ? 'red' : 'default'} className="p-4">
            <div className="flex flex-col gap-1">
              <Text variant="supporting">Quá hạn</Text>
              <Text variant="large" className="font-semibold tabular-nums">
                {formatCurrency(summary.totalOverdue)}
              </Text>
              <Text variant="supporting">{summary.overdueCount} khoản quá hạn</Text>
            </div>
          </Card>
        </div>
      )}

      {/* Aging Report (admin and ke_toan only) */}
      {canViewAging && aging && (
        <DataTableCard<AgingRow>
          label="Báo cáo tuổi nợ"
          data={agingRows}
          columns={agingColumns}
          idKey="id"
          density="compact"
          toolbar={
            <div className="flex flex-col gap-0.5">
              <Heading level={3}>Báo cáo tuổi nợ</Heading>
              <Text variant="supporting">
                Phân nhóm số tiền còn phải thu theo số ngày quá hạn so với ngày đáo hạn.
              </Text>
            </div>
          }
        />
      )}

      {/* Content State */}
      <DataTableCard<ReceivableRow>
        label="Danh sách công nợ phải thu"
        data={receivables}
        columns={columns}
        idKey="id"
        density="compact"
        isLoading={loading}
        error={error}
        onRetry={fetchList}
        emptyTitle="Không tìm thấy khoản công nợ nào"
        emptyDescription="Thử thay đổi bộ lọc tìm kiếm hoặc bỏ điều kiện chỉ hiển thị công nợ quá hạn."
        pagination={{ page, totalPages, totalItems: total, pageSize, onChange: setPage }}
        rowIndexStart={(page - 1) * pageSize + 1}
        rowCount={total}
        toolbar={
          <FilterBar
            label="Bộ lọc danh sách công nợ phải thu"
            search={{
              label: 'Tìm kiếm công nợ',
              placeholder: 'Tìm theo mã hóa đơn hoặc tên khách hàng...',
              value: search,
              onChange: setSearch,
              widthClassName: 'w-full sm:w-80',
            }}
            onSubmit={handleSearchSubmit}
            filters={
              <>
                <Select
                  label="Trạng thái"
                  options={STATUS_OPTIONS}
                  value={trangThai}
                  onChange={(value) => {
                    setTrangThai(value as ReceivableStatus | '');
                    setPage(1);
                  }}
                  className="w-full sm:w-48"
                />
                <Checkbox
                  label="Chỉ công nợ quá hạn"
                  checked={overdueOnly}
                  onChange={(checked) => {
                    setOverdueOnly(checked);
                    setPage(1);
                  }}
                />
              </>
            }
            isFiltered={isFiltered}
            onReset={() => {
              setSearch('');
              setTrangThai('');
              setOverdueOnly(false);
              setPage(1);
              setReloadToken((token) => token + 1);
            }}
          />
        }
      />
    </PageScaffold>
  );
};
