import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Text } from '../../components/ui/Typography.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Select } from '../../components/ui/Select.js';
import { TextLink } from '../../components/ui/TextLink.js';
import { proportional, pixel, type TableColumn } from '../../components/ui/Table.js';
import { Order, OrderStatus } from '../../types/order.js';
import { getOrders } from '../../services/orderService.js';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { DataTableCard } from '../../components/common/DataTableCard.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';

/**
 * Columns this screen reads off `Order`. Declared as an object type alias so the
 * API payload can be handed to the table as-is, without re-mapping rows.
 */
type OrderRow = {
  id: number;
  ma_don_ban: string;
  ma_khach_hang: number;
  ten_khach_hang?: string;
  ngay_dat_hang: string;
  ngay_giao_hang_yc: string;
  tong_thanh_toan: string | number;
  ten_nguoi_ban?: string;
  trang_thai: OrderStatus;
};

const TRANG_THAI_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'cho_xac_nhan', label: 'Chờ xác nhận' },
  { value: 'da_xac_nhan', label: 'Đã xác nhận' },
  { value: 'dang_san_xuat', label: 'Đang sản xuất' },
  { value: 'da_giao', label: 'Đã giao hàng' },
  { value: 'huy', label: 'Đã hủy' },
];

/** `da_giao` reads "Đã giao hàng" on this screen; the shared badge labels it "Đã giao". */
const STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  da_giao: 'Đã giao hàng',
};

const formatCurrency = (val: string | number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN');
};

const columns: TableColumn<OrderRow>[] = [
  {
    key: 'ma_don_ban',
    header: 'Mã đơn',
    width: proportional(1),
    renderCell: (item) => (
      <TextLink to={`/sales-orders/${item.id}`} weight="semibold">
        {item.ma_don_ban}
      </TextLink>
    ),
  },
  {
    key: 'ten_khach_hang',
    header: 'Khách hàng',
    width: proportional(2),
    renderCell: (item) => (
      <Text variant="label">{item.ten_khach_hang || `Khách #${item.ma_khach_hang}`}</Text>
    ),
  },
  {
    key: 'ngay_dat_hang',
    header: 'Ngày đặt',
    width: pixel(120),
    renderCell: (item) => <Text variant="supporting">{formatDate(item.ngay_dat_hang)}</Text>,
  },
  {
    key: 'ngay_giao_hang_yc',
    header: 'Hạn giao',
    width: pixel(120),
    renderCell: (item) => <Text variant="supporting">{formatDate(item.ngay_giao_hang_yc)}</Text>,
  },
  {
    key: 'tong_thanh_toan',
    header: 'Tổng thanh toán',
    width: pixel(160),
    align: 'end',
    renderCell: (item) => (
      <Text variant="label" className="tabular-nums">
        {formatCurrency(item.tong_thanh_toan)}
      </Text>
    ),
  },
  {
    key: 'ten_nguoi_ban',
    header: 'Người bán',
    width: proportional(1),
    renderCell: (item) => <Text variant="supporting">{item.ten_nguoi_ban || '—'}</Text>,
  },
  {
    key: 'trang_thai',
    header: 'Trạng thái',
    width: pixel(150),
    align: 'center',
    renderCell: (item) => (
      <StatusBadge status={item.trang_thai} label={STATUS_LABELS[item.trang_thai]} />
    ),
  },
  {
    key: 'actions',
    header: 'Thao tác',
    width: pixel(110),
    align: 'end',
    renderCell: (item) => (
      <TextLink to={`/sales-orders/${item.id}`} weight="medium">
        Chi tiết
      </TextLink>
    ),
  },
];

export const SalesOrderListPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [trangThai, setTrangThai] = useState<OrderStatus | ''>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOrders({
        page,
        pageSize,
        search: search.trim() || undefined,
        trang_thai: trangThai || undefined,
      });
      setOrders(res.orders);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách đơn bán hàng');
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

  return (
    <PageScaffold
      title="Quản lý đơn bán hàng"
      subtitle={`Theo dõi và xử lý đơn hàng (${total} đơn hàng)`}
      actions={
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          href="/sales-orders/new"
        >
          Tạo đơn hàng mới
        </Button>
      }
    >
      <DataTableCard<OrderRow>
        label="Danh sách đơn bán hàng"
        data={orders}
        columns={columns}
        idKey="id"
        isLoading={loading}
        error={error}
        onRetry={fetchList}
        emptyTitle="Không tìm thấy đơn hàng nào"
        emptyDescription="Thử thay đổi bộ lọc tìm kiếm hoặc tạo đơn bán hàng mới."
        pagination={{ page, totalPages, totalItems: total, pageSize, onChange: setPage }}
        rowIndexStart={(page - 1) * pageSize + 1}
        rowCount={total}
        toolbar={
          <form onSubmit={handleSearchSubmit}>
            <div className="flex flex-row flex-wrap items-end gap-2">
              <Input
                label="Tìm kiếm đơn hàng"
                placeholder="Tìm theo mã đơn hàng hoặc tên khách..."
                value={search}
                onChange={setSearch}
                className="w-80"
              />
              <Button type="submit" variant="secondary">Tìm kiếm</Button>
            </div>
          </form>
        }
        toolbarEnd={
          <Select
            label="Trạng thái"
            options={TRANG_THAI_OPTIONS}
            value={trangThai}
            onChange={(value) => {
              setTrangThai(value as OrderStatus | '');
              setPage(1);
            }}
            className="w-48"
          />
        }
      />
    </PageScaffold>
  );
};
