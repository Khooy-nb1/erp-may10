import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Link } from '@astryxdesign/core/Link';
import { proportional, pixel, type TableColumn } from '@astryxdesign/core/Table';
import { Delivery, DeliveryStatus } from '../../types/delivery.js';
import { getDeliveries } from '../../services/deliveryService.js';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { DataTableCard } from '../../components/common/DataTableCard.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';

/**
 * Columns this screen reads off `Delivery`. Declared as an object type alias so
 * the API payload can be handed to the table as-is, without re-mapping rows.
 */
type DeliveryRow = {
  id: number;
  ma_giao_hang: string;
  ma_don_ban_hang: number;
  ma_don_ban?: string;
  ma_kho: number;
  ten_kho?: string;
  ngay_giao: string;
  ten_nguoi_nhan: string;
  trang_thai: DeliveryStatus;
};

const TRANG_THAI_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'cho_giao', label: 'Chờ giao hàng' },
  { value: 'dang_giao', label: 'Đang vận chuyển' },
  { value: 'da_giao', label: 'Đã giao thành công' },
  { value: 'that_bai', label: 'Giao thất bại' },
];

/** `da_giao` reads "Đã giao thành công" on this screen; the shared badge labels it "Đã giao". */
const STATUS_LABELS: Partial<Record<DeliveryStatus, string>> = {
  da_giao: 'Đã giao thành công',
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN');
};

const columns: TableColumn<DeliveryRow>[] = [
  {
    key: 'ma_giao_hang',
    header: 'Mã giao hàng',
    width: proportional(1),
    renderCell: (item) => (
      <Link href={`/deliveries/${item.id}`} weight="semibold">
        {item.ma_giao_hang}
      </Link>
    ),
  },
  {
    key: 'ma_don_ban',
    header: 'Đơn bán hàng',
    width: proportional(1),
    renderCell: (item) => (
      <Link href={`/sales-orders/${item.ma_don_ban_hang}`} weight="medium">
        {item.ma_don_ban || `Đơn #${item.ma_don_ban_hang}`}
      </Link>
    ),
  },
  {
    key: 'ten_kho',
    header: 'Kho xuất',
    width: proportional(1),
    renderCell: (item) => <Text type="supporting">{item.ten_kho || `Kho #${item.ma_kho}`}</Text>,
  },
  {
    key: 'ngay_giao',
    header: 'Ngày giao',
    width: pixel(120),
    renderCell: (item) => <Text type="supporting">{formatDate(item.ngay_giao)}</Text>,
  },
  {
    key: 'ten_nguoi_nhan',
    header: 'Người nhận',
    width: proportional(1),
    renderCell: (item) => <Text type="label">{item.ten_nguoi_nhan}</Text>,
  },
  {
    key: 'trang_thai',
    header: 'Trạng thái',
    width: pixel(160),
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
      <Link href={`/deliveries/${item.id}`} weight="medium">
        Chi tiết
      </Link>
    ),
  },
];

export const DeliveryListPage: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [trangThai, setTrangThai] = useState<DeliveryStatus | ''>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

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
  }, [page, trangThai]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchList();
  };

  return (
    <PageScaffold
      title="Quản lý giao hàng"
      subtitle={`Theo dõi vận chuyển và xác nhận giao nhận (${total} đợt giao)`}
      actions={
        <Button
          label="Lập đợt giao hàng"
          variant="primary"
          icon={<Plus size={16} />}
          href="/deliveries/new"
        />
      }
    >
      <Banner
        status="info"
        title="Quy tắc nghiệp vụ:"
        description="Phân hệ Giao hàng vận hành theo quy trình phiếu giao hàng cấp đầu phiếu (header-only). Việc hoàn thành giao hàng không tự động trừ tồn kho và không ghi nhận chi tiết dòng sản phẩm (tuân thủ giới hạn schema)."
        collapsible={false}
      />

      <DataTableCard<DeliveryRow>
        label="Danh sách đợt giao hàng"
        data={deliveries}
        columns={columns}
        idKey="id"
        isLoading={loading}
        error={error}
        onRetry={fetchList}
        emptyTitle="Không tìm thấy đợt giao hàng nào"
        emptyDescription="Thử thay đổi bộ lọc tìm kiếm hoặc lập đợt giao hàng mới."
        pagination={{ page, totalPages, totalItems: total, pageSize, onChange: setPage }}
        rowIndexStart={(page - 1) * pageSize + 1}
        rowCount={total}
        toolbar={
          <form onSubmit={handleSearchSubmit}>
            <HStack gap={2} vAlign="end" wrap="wrap">
              <TextInput
                label="Tìm kiếm đợt giao hàng"
                placeholder="Tìm theo mã giao hàng hoặc người nhận..."
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
              setTrangThai(value as DeliveryStatus | '');
              setPage(1);
            }}
            width={190}
          />
        }
      />
    </PageScaffold>
  );
};
