import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Link } from '@astryxdesign/core/Link';
import { proportional, pixel, type TableColumn } from '@astryxdesign/core/Table';
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
      <Link href={`/sales-orders/${item.id}`} weight="semibold">
        {item.ma_don_ban}
      </Link>
    ),
  },
  {
    key: 'ten_khach_hang',
    header: 'Khách hàng',
    width: proportional(2),
    renderCell: (item) => (
      <Text type="label">{item.ten_khach_hang || `Khách #${item.ma_khach_hang}`}</Text>
    ),
  },
  {
    key: 'ngay_dat_hang',
    header: 'Ngày đặt',
    width: pixel(120),
    renderCell: (item) => <Text type="supporting">{formatDate(item.ngay_dat_hang)}</Text>,
  },
  {
    key: 'ngay_giao_hang_yc',
    header: 'Hạn giao',
    width: pixel(120),
    renderCell: (item) => <Text type="supporting">{formatDate(item.ngay_giao_hang_yc)}</Text>,
  },
  {
    key: 'tong_thanh_toan',
    header: 'Tổng thanh toán',
    width: pixel(160),
    align: 'end',
    renderCell: (item) => (
      <Text type="label" hasTabularNumbers>
        {formatCurrency(item.tong_thanh_toan)}
      </Text>
    ),
  },
  {
    key: 'ten_nguoi_ban',
    header: 'Người bán',
    width: proportional(1),
    renderCell: (item) => <Text type="supporting">{item.ten_nguoi_ban || '—'}</Text>,
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
      <Link href={`/sales-orders/${item.id}`} weight="medium">
        Chi tiết
      </Link>
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
          label="Tạo đơn hàng mới"
          variant="primary"
          icon={<Plus size={16} />}
          href="/sales-orders/new"
        />
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
            <HStack gap={2} vAlign="end" wrap="wrap">
              <TextInput
                label="Tìm kiếm đơn hàng"
                placeholder="Tìm theo mã đơn hàng hoặc tên khách..."
                value={search}
                onChange={setSearch}
                width={320}
              />
              <Button type="submit" label="Tìm kiếm" variant="secondary" />
            </HStack>
          </form>
        }
        toolbarEnd={
          <Selector
            label="Trạng thái"
            options={TRANG_THAI_OPTIONS}
            value={trangThai}
            onChange={(value) => {
              setTrangThai(value as OrderStatus | '');
              setPage(1);
            }}
            width={190}
          />
        }
      />
    </PageScaffold>
  );
};
