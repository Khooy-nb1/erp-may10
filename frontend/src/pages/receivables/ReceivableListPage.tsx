import React, { useState, useEffect } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Grid } from '@astryxdesign/core/Grid';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { proportional, pixel, type TableColumn } from '@astryxdesign/core/Table';
import { Receivable, ReceivableStatus, ReceivableSummary, AgingReport, AgingBucket } from '../../types/receivable.js';
import { getReceivables, getReceivableSummary, getAgingReport } from '../../services/receivableService.js';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { DataTableCard } from '../../components/common/DataTableCard.js';
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

const formatCurrency = (val: string | number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN');
};

const agingColumns: TableColumn<AgingRow>[] = [
  {
    key: 'label',
    header: 'Nhóm tuổi nợ',
    width: proportional(2),
    renderCell: (item) => <Text weight={item.isTotal ? 'bold' : 'normal'}>{item.label}</Text>,
  },
  {
    key: 'count',
    header: 'Số khoản',
    width: pixel(120),
    align: 'center',
    renderCell: (item) => (
      <Text weight={item.isTotal ? 'bold' : 'normal'} hasTabularNumbers>
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
      <Text weight={item.isTotal ? 'bold' : 'semibold'} hasTabularNumbers>
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

  /**
   * Sortable header: clicking it toggles the server-side sort exactly like the
   * old header button did. The arrow icon shows the active direction and the
   * accessible name carries it too, so the sort state is not colour-only.
   */
  const renderSortHeader = (column: SortColumn, label: string, tooltip: string) => (
    <Button
      label={sortBy === column ? `${label} (sắp xếp ${sortOrder === 'ASC' ? 'tăng dần' : 'giảm dần'})` : label}
      variant="ghost"
      size="sm"
      icon={
        sortBy === column ? sortOrder === 'ASC' ? <ArrowUp size={14} /> : <ArrowDown size={14} /> : undefined
      }
      tooltip={tooltip}
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
        <VStack gap={0.5}>
          <Text weight="medium">{item.ten_khach_hang || `Mã #${item.ma_khach_hang}`}</Text>
          {item.ma_khach_hang_code ? (
            <Text type="code" color="secondary">
              {item.ma_khach_hang_code}
            </Text>
          ) : null}
        </VStack>
      ),
    },
    {
      key: 'ma_hoa_don_code',
      header: 'Hóa đơn',
      width: proportional(1),
      renderCell: (item) => (
        <Text type="code" weight="semibold">
          {item.ma_hoa_don_code || '—'}
        </Text>
      ),
    },
    {
      key: 'so_tien_phat_sinh',
      header: 'Phát sinh',
      width: pixel(160),
      align: 'end',
      renderCell: (item) => <Text hasTabularNumbers>{formatCurrency(item.so_tien_phat_sinh)}</Text>,
    },
    {
      key: 'so_tien_da_thanh_toan',
      header: 'Đã thanh toán',
      width: pixel(160),
      align: 'end',
      renderCell: (item) => <Text hasTabularNumbers>{formatCurrency(item.so_tien_da_thanh_toan)}</Text>,
    },
    {
      key: 'so_tien_con_lai',
      header: renderSortHeader('so_tien_con_lai', 'Còn lại', 'Sắp xếp theo số tiền còn lại'),
      width: pixel(160),
      align: 'end',
      renderCell: (item) => (
        <Text weight="bold" hasTabularNumbers>
          {formatCurrency(item.so_tien_con_lai)}
        </Text>
      ),
    },
    {
      key: 'ngay_dao_han',
      header: renderSortHeader('ngay_dao_han', 'Ngày đáo hạn', 'Sắp xếp theo ngày đáo hạn'),
      width: pixel(170),
      renderCell: (item) => <Text type="supporting">{formatDate(item.ngay_dao_han)}</Text>,
    },
    {
      key: 'days_overdue',
      header: 'Số ngày quá hạn',
      width: pixel(160),
      renderCell: (item) => {
        const daysOverdue = Number(item.daysOverdue) || 0;
        return daysOverdue > 0 ? (
          <Text weight="semibold">Quá hạn {daysOverdue} ngày</Text>
        ) : (
          <Text color="secondary">—</Text>
        );
      },
    },
    {
      key: 'trang_thai',
      header: 'Trạng thái',
      width: pixel(150),
      align: 'center',
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
          endContent={<Button label="Thử lại" variant="secondary" size="sm" onClick={fetchOverview} />}
        />
      )}

      {/* Summary KPI Cards */}
      {summary && (
        <Grid columns={{ minWidth: 200, repeat: 'fit' }} gap={4}>
          <Card padding={4}>
            <VStack gap={1}>
              <Text type="supporting">Tổng phát sinh</Text>
              <Text type="large" weight="semibold">
                {formatCurrency(summary.totalOriginal)}
              </Text>
            </VStack>
          </Card>
          <Card padding={4}>
            <VStack gap={1}>
              <Text type="supporting">Đã thu</Text>
              <Text type="large" weight="semibold">
                {formatCurrency(summary.totalPaid)}
              </Text>
            </VStack>
          </Card>
          <Card padding={4}>
            <VStack gap={1}>
              <Text type="supporting">Còn phải thu</Text>
              <Text type="large" weight="semibold">
                {formatCurrency(summary.totalOutstanding)}
              </Text>
            </VStack>
          </Card>
          <Card padding={4}>
            <VStack gap={1}>
              <Text type="supporting">Quá hạn</Text>
              <Text type="large" weight="semibold">
                {formatCurrency(summary.totalOverdue)}
              </Text>
              <Text type="supporting">{summary.overdueCount} khoản quá hạn</Text>
            </VStack>
          </Card>
        </Grid>
      )}

      {/* Aging Report (admin and ke_toan only) */}
      {canViewAging && aging && (
        <DataTableCard<AgingRow>
          label="Báo cáo tuổi nợ"
          data={agingRows}
          columns={agingColumns}
          idKey="id"
          toolbar={
            <VStack gap={0.5}>
              <Heading level={3}>Báo cáo tuổi nợ</Heading>
              <Text type="supporting">
                Phân nhóm số tiền còn phải thu theo số ngày quá hạn so với ngày đáo hạn.
              </Text>
            </VStack>
          }
        />
      )}

      {/* Content State */}
      <DataTableCard<ReceivableRow>
        label="Danh sách công nợ phải thu"
        data={receivables}
        columns={columns}
        idKey="id"
        isLoading={loading}
        error={error}
        onRetry={fetchList}
        emptyTitle="Không tìm thấy khoản công nợ nào"
        emptyDescription="Thử thay đổi bộ lọc tìm kiếm hoặc bỏ điều kiện chỉ hiển thị công nợ quá hạn."
        pagination={{ page, totalPages, totalItems: total, pageSize, onChange: setPage }}
        rowIndexStart={(page - 1) * pageSize + 1}
        rowCount={total}
        toolbar={
          <form onSubmit={handleSearchSubmit}>
            <HStack gap={2} vAlign="end" wrap="wrap">
              <TextInput
                label="Tìm kiếm công nợ"
                placeholder="Tìm theo mã hóa đơn hoặc tên khách hàng..."
                value={search}
                onChange={setSearch}
                width={320}
              />
              <Button type="submit" label="Tìm kiếm" variant="secondary" />
            </HStack>
          </form>
        }
        toolbarEnd={
          <HStack gap={3} vAlign="end" wrap="wrap">
            <Selector
              label="Trạng thái"
              options={STATUS_OPTIONS}
              value={trangThai}
              onChange={(value) => {
                setTrangThai(value as ReceivableStatus | '');
                setPage(1);
              }}
              width={190}
            />
            <CheckboxInput
              label="Chỉ công nợ quá hạn"
              value={overdueOnly}
              onChange={(checked) => {
                setOverdueOnly(checked);
                setPage(1);
              }}
            />
          </HStack>
        }
      />
    </PageScaffold>
  );
};
