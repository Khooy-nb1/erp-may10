import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Text } from '../components/ui/Typography.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Select } from '../components/ui/Select.jsx';
import { TextLink } from '../components/ui/TextLink.jsx';
import { proportional, pixel } from '../components/ui/Table.jsx';
import { getOrders } from '../services/orderService.js';
import { formatCurrency, formatDate } from '../lib/format.js';
import { PageScaffold } from '../components/common/PageScaffold.jsx';
import { DataTableCard } from '../components/common/DataTableCard.jsx';
import { FilterBar } from '../components/common/FilterBar.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { SalesOrderCreateDialog } from '../components/orders/SalesOrderCreateDialog.jsx';

/**
 * Sales-order list (PH1 `pages/orders/SalesOrderListPage.tsx`, ported 1:1 for Step 6H).
 *
 * The API payload is handed to the table as-is, without re-mapping rows, so the
 * columns below are exactly the fields this screen reads off an order.
 *
 * Core adaptations: `useAuth` is not needed here; every in-module link is rewritten
 * under Core's `/sales` mount (`/sales-orders/:id` -> `/sales/orders/:id`) and order
 * creation opens `SalesOrderCreateDialog` instead of navigating to `/sales-orders/new`.
 */

const TRANG_THAI_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'cho_xac_nhan', label: 'Chờ xác nhận' },
  { value: 'da_xac_nhan', label: 'Đã xác nhận' },
  { value: 'dang_san_xuat', label: 'Đang sản xuất' },
  { value: 'da_giao', label: 'Đã giao hàng' },
  { value: 'huy', label: 'Đã hủy' },
];

/** `da_giao` reads "Đã giao hàng" on this screen; the shared badge labels it "Đã giao". */
const STATUS_LABELS = {
  da_giao: 'Đã giao hàng',
};

const columns = [
  {
    key: 'ma_don_ban',
    header: 'Mã đơn',
    width: proportional(1),
    renderCell: (item) => (
      <TextLink to={`/sales/orders/${item.id}`} weight="semibold">
        {item.ma_don_ban}
      </TextLink>
    ),
  },
  {
    key: 'ten_khach_hang',
    header: 'Khách hàng',
    width: proportional(2),
    renderCell: (item) => {
      const customer = item.ten_khach_hang || `Khách #${item.ma_khach_hang}`;
      return (
        <span className="block max-w-[280px] truncate font-medium" title={customer}>
          {customer}
        </span>
      );
    },
  },
  {
    key: 'ten_nguoi_ban',
    header: 'Người bán',
    width: proportional(1),
    renderCell: (item) => <Text variant="supporting">{item.ten_nguoi_ban || '—'}</Text>,
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
    key: 'trang_thai',
    header: 'Trạng thái',
    width: pixel(150),
    align: 'start',
    renderCell: (item) => (
      <StatusBadge status={item.trang_thai} label={STATUS_LABELS[item.trang_thai]} />
    ),
  },
];

export function SalesOrderListPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [trangThai, setTrangThai] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  /**
   * Bumped by "Xóa bộ lọc" so a reset that cleared a submit-triggered search
   * alone still refetches, even when the page never left 1.
   */
  const [reloadToken, setReloadToken] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  // Set while a successful create hands off to the detail route, so the close
  // that follows it does not refetch a list the page is leaving.
  const createdRef = useRef(false);

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
  }, [page, trangThai, reloadToken]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchList();
  };

  const handleCreateOpenChange = (isOpen) => {
    setCreateOpen(isOpen);
    if (isOpen || createdRef.current) {
      createdRef.current = false;
      return;
    }
    fetchList();
  };

  return (
    <PageScaffold
      title="Quản lý đơn bán hàng"
      subtitle={`Theo dõi và xử lý đơn hàng (${total} đơn hàng)`}
      actions={
        <Button
          variant="primary"
          icon={<Plus size={16} aria-hidden />}
          onClick={() => setCreateOpen(true)}
        >
          Tạo đơn bán hàng
        </Button>
      }
    >
      <DataTableCard
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
        density="compact"
        toolbar={
          <FilterBar
            label="Bộ lọc danh sách đơn bán hàng"
            search={{
              label: 'Tìm kiếm đơn hàng',
              placeholder: 'Tìm theo mã đơn hàng hoặc tên khách...',
              value: search,
              onChange: setSearch,
            }}
            onSubmit={handleSearchSubmit}
            filters={
              <Select
                label="Trạng thái"
                options={TRANG_THAI_OPTIONS}
                value={trangThai}
                onChange={(value) => {
                  setTrangThai(value);
                  setPage(1);
                }}
                className="w-full sm:w-48"
              />
            }
            isFiltered={Boolean(search.trim() || trangThai)}
            onReset={() => {
              setSearch('');
              setTrangThai('');
              setPage(1);
              setReloadToken((token) => token + 1);
            }}
          />
        }
      />

      <SalesOrderCreateDialog
        isOpen={createOpen}
        onOpenChange={handleCreateOpenChange}
        onCreated={(id) => {
          createdRef.current = true;
          navigate(`/sales/orders/${id}`);
        }}
      />
    </PageScaffold>
  );
}
