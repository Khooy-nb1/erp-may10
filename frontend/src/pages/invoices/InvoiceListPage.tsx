import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Link } from '@astryxdesign/core/Link';
import { proportional, pixel, type TableColumn } from '@astryxdesign/core/Table';
import { Invoice, InvoiceStatus } from '../../types/invoice.js';
import { getInvoices } from '../../services/invoiceService.js';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { DataTableCard } from '../../components/common/DataTableCard.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { useAuth } from '../../context/AuthContext.js';

/**
 * Columns this screen reads off `Invoice`. Declared as an object type alias so
 * the API payload can be handed to the table as-is, without re-mapping rows.
 */
type InvoiceRow = {
  id: number;
  ma_hoa_don: string;
  ma_don_ban_hang: number;
  ma_don_ban?: string;
  ma_khach_hang: number;
  ten_khach_hang?: string;
  ngay_xuat_hoa_don: string;
  ngay_dao_han: string;
  tong_tien_sau_thue: number | string;
  so_tien_da_thu: number | string;
  trang_thai: InvoiceStatus;
};

const TRANG_THAI_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'chua_thanh_toan', label: 'Chưa thanh toán' },
  { value: 'thanh_toan_mot_phan', label: 'Thanh toán một phần' },
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

const columns: TableColumn<InvoiceRow>[] = [
  {
    key: 'ma_hoa_don',
    header: 'Mã hóa đơn',
    width: proportional(1),
    renderCell: (item) => (
      <Link href={`/invoices/${item.id}`} weight="semibold">
        {item.ma_hoa_don}
      </Link>
    ),
  },
  {
    key: 'ma_don_ban',
    header: 'Đơn bán hàng',
    width: proportional(1),
    renderCell: (item) => (
      <Link href={`/sales-orders/${item.ma_don_ban_hang}`}>
        {item.ma_don_ban || `Đơn #${item.ma_don_ban_hang}`}
      </Link>
    ),
  },
  {
    key: 'ten_khach_hang',
    header: 'Khách hàng',
    width: proportional(2),
    renderCell: (item) => <Text>{item.ten_khach_hang || `Mã #${item.ma_khach_hang}`}</Text>,
  },
  {
    key: 'ngay_xuat_hoa_don',
    header: 'Ngày xuất',
    width: pixel(120),
    renderCell: (item) => <Text type="supporting">{formatDate(item.ngay_xuat_hoa_don)}</Text>,
  },
  {
    key: 'ngay_dao_han',
    header: 'Ngày đáo hạn',
    width: pixel(130),
    renderCell: (item) => <Text type="supporting">{formatDate(item.ngay_dao_han)}</Text>,
  },
  {
    key: 'tong_tien_sau_thue',
    header: 'Tổng thanh toán',
    width: pixel(160),
    align: 'end',
    renderCell: (item) => (
      <Text type="label" hasTabularNumbers>
        {formatCurrency(item.tong_tien_sau_thue)}
      </Text>
    ),
  },
  {
    key: 'so_tien_da_thu',
    header: 'Đã thu',
    width: pixel(150),
    align: 'end',
    renderCell: (item) => <Text hasTabularNumbers>{formatCurrency(item.so_tien_da_thu)}</Text>,
  },
  {
    key: 'trang_thai',
    header: 'Trạng thái',
    width: pixel(150),
    align: 'center',
    renderCell: (item) => <StatusBadge status={item.trang_thai} />,
  },
  {
    key: 'actions',
    header: 'Thao tác',
    width: pixel(110),
    align: 'end',
    renderCell: (item) => (
      <Link href={`/invoices/${item.id}`} weight="medium">
        Chi tiết
      </Link>
    ),
  },
];

export const InvoiceListPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const canCreateInvoice = user?.vai_tro === 'ke_toan' || user?.vai_tro === 'admin';

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [trangThai, setTrangThai] = useState<InvoiceStatus | ''>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInvoices({
        page,
        pageSize,
        search: search.trim() || undefined,
        trang_thai: trangThai || undefined,
      });
      setInvoices(res.invoices);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách hóa đơn');
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
      title="Quản lý hóa đơn bán hàng"
      subtitle={`Theo dõi xuất hóa đơn và tình trạng thanh toán (${total} hóa đơn)`}
      actions={
        canCreateInvoice ? (
          <Button label="Xuất hóa đơn mới" variant="primary" icon={<Plus size={16} />} href="/invoices/new" />
        ) : undefined
      }
    >
      <DataTableCard<InvoiceRow>
        label="Danh sách hóa đơn bán hàng"
        data={invoices}
        columns={columns}
        idKey="id"
        isLoading={loading}
        error={error}
        onRetry={fetchList}
        emptyTitle="Không tìm thấy hóa đơn nào"
        emptyDescription="Thử thay đổi bộ lọc tìm kiếm hoặc tạo mới hóa đơn từ đơn hàng đã xác nhận."
        pagination={{ page, totalPages, totalItems: total, pageSize, onChange: setPage }}
        rowIndexStart={(page - 1) * pageSize + 1}
        rowCount={total}
        toolbar={
          <form onSubmit={handleSearchSubmit}>
            <HStack gap={2} vAlign="end" wrap="wrap">
              <TextInput
                label="Tìm kiếm hóa đơn"
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
          <Selector
            label="Trạng thái"
            options={TRANG_THAI_OPTIONS}
            value={trangThai}
            onChange={(value) => {
              setTrangThai(value as InvoiceStatus | '');
              setPage(1);
            }}
            width={190}
          />
        }
      />
    </PageScaffold>
  );
};
