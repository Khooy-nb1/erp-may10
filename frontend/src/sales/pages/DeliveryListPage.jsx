import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Text } from '../components/ui/Typography.jsx';
import { Banner } from '../components/ui/Banner.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Select } from '../components/ui/Select.jsx';
import { TextLink } from '../components/ui/TextLink.jsx';
import { proportional, pixel } from '../components/ui/Table.jsx';
import { getDeliveries } from '../services/deliveryService.js';
import { PageScaffold } from '../components/common/PageScaffold.jsx';
import { DataTableCard } from '../components/common/DataTableCard.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { FilterBar } from '../components/common/FilterBar.jsx';
import { DeliveryCreateDialog } from '../components/deliveries/DeliveryCreateDialog.jsx';
import { formatDate } from '../lib/format.js';

/**
 * Delivery batches (PH1 \`pages/deliveries/DeliveryListPage.tsx\`, ported 1:1 for Step 6H).
 * \`da_giao\` reads "Đã giao thành công" on this screen; the shared badge labels it "Đã giao".
 */

const TRANG_THAI_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'cho_giao', label: 'Chờ giao hàng' },
  { value: 'dang_giao', label: 'Đang vận chuyển' },
  { value: 'da_giao', label: 'Đã giao thành công' },
  { value: 'that_bai', label: 'Giao thất bại' },
];

const STATUS_LABELS = {
  da_giao: 'Đã giao thành công',
};

const columns = [
  {
    key: 'ma_giao_hang',
    header: 'Mã giao hàng',
    width: proportional(1),
    renderCell: (item) => (
      <TextLink to={'/sales/deliveries/' + item.id} weight="semibold">
        {item.ma_giao_hang}
      </TextLink>
    ),
  },
  {
    key: 'ma_don_ban',
    header: 'Đơn bán hàng',
    width: proportional(1),
    renderCell: (item) => (
      <TextLink to={'/sales/orders/' + item.ma_don_ban_hang} weight="medium">
        {item.ma_don_ban || 'Đơn #' + item.ma_don_ban_hang}
      </TextLink>
    ),
  },
  {
    key: 'ten_kho',
    header: 'Kho xuất',
    width: proportional(1),
    renderCell: (item) => <Text variant="supporting">{item.ten_kho || 'Kho #' + item.ma_kho}</Text>,
  },
  {
    key: 'ngay_giao',
    header: 'Ngày giao',
    width: pixel(120),
    renderCell: (item) => <Text variant="supporting">{formatDate(item.ngay_giao)}</Text>,
  },
  {
    key: 'ten_nguoi_nhan',
    header: 'Người nhận',
    width: proportional(1),
    renderCell: (item) => (
      <span className="block max-w-[280px] truncate" title={item.ten_nguoi_nhan}>
        {item.ten_nguoi_nhan}
      </span>
    ),
  },
  {
    key: 'trang_thai',
    header: 'Trạng thái',
    width: pixel(160),
    align: 'start',
    renderCell: (item) => <StatusBadge status={item.trang_thai} label={STATUS_LABELS[item.trang_thai]} />,
  },
];

export function DeliveryListPage() {
  const navigate = useNavigate();

  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [trangThai, setTrangThai] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  // The search term is submit-triggered, so it is not an effect dependency;
  // this token lets "Xóa bộ lọc" refetch when it cleared the search alone.
  const [reloadToken, setReloadToken] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  // Set while a successful create hands off to the detail route, so the close
  // that follows it does not refetch a list the page is leaving.
  const createdRef = useRef(false);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDeliveries({
        page,
        pageSize,
        search: search.trim() || undefined,
        trang_thai: trangThai || undefined,
      });
      setDeliveries(res.deliveries);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách đợt giao hàng');
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
      title="Quản lý giao hàng"
      subtitle={'Theo dõi vận chuyển và xác nhận giao nhận (' + total + ' đợt giao)'}
      actions={
        <Button variant="primary" icon={<Plus size={16} aria-hidden />} onClick={() => setCreateOpen(true)}>
          Tạo phiếu giao hàng
        </Button>
      }
    >
      <Banner
        status="info"
        title="Quy tắc nghiệp vụ:"
        description="Phân hệ Giao hàng vận hành theo quy trình phiếu giao hàng ở cấp phiếu (không quản lý chi tiết dòng). Việc hoàn thành giao hàng không tự động trừ tồn kho và không ghi nhận chi tiết dòng sản phẩm (tuân thủ giới hạn lược đồ dữ liệu)."
      />

      <DataTableCard
        label="Danh sách đợt giao hàng"
        data={deliveries}
        columns={columns}
        idKey="id"
        density="compact"
        isLoading={loading}
        error={error}
        onRetry={fetchList}
        emptyTitle="Không tìm thấy đợt giao hàng nào"
        emptyDescription="Thử thay đổi bộ lọc tìm kiếm hoặc lập đợt giao hàng mới."
        pagination={{ page, totalPages, totalItems: total, pageSize, onChange: setPage }}
        rowIndexStart={(page - 1) * pageSize + 1}
        rowCount={total}
        toolbar={
          <FilterBar
            label="Bộ lọc danh sách đợt giao hàng"
            search={{
              label: 'Tìm kiếm đợt giao hàng',
              placeholder: 'Tìm theo mã giao hàng hoặc người nhận...',
              value: search,
              onChange: setSearch,
              widthClassName: 'w-full sm:w-80',
            }}
            onSubmit={handleSearchSubmit}
            filters={
              <Select
                label="Trạng thái"
                options={TRANG_THAI_OPTIONS}
                value={trangThai}
                onChange={(value) => {
                  setTrangThai(value || '');
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

      <DeliveryCreateDialog
        isOpen={createOpen}
        onOpenChange={handleCreateOpenChange}
        onCreated={(id) => {
          createdRef.current = true;
          navigate('/sales/deliveries/' + id);
        }}
      />
    </PageScaffold>
  );
}
