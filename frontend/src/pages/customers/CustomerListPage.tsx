import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Selector } from '@astryxdesign/core/Selector';
import { Link } from '@astryxdesign/core/Link';
import { proportional, pixel, type TableColumn } from '@astryxdesign/core/Table';
import { Customer, CustomerType, CustomerStatus } from '../../types/customer.js';
import { getCustomers } from '../../services/customerService.js';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { DataTableCard } from '../../components/common/DataTableCard.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';

/**
 * Columns this screen reads off `Customer`. Declared as an object type alias so
 * the API payload can be handed to the table as-is, without re-mapping rows.
 */
type CustomerRow = {
  id: number;
  ma_khach_hang: string;
  ten_khach_hang: string;
  loai_khach_hang: CustomerType;
  so_dien_thoai: string;
  tinh_thanh_pho: string;
  han_muc_cong_no: string | number;
  trang_thai: CustomerStatus;
};

const LOAI_KHACH_OPTIONS = [
  { value: '', label: 'Tất cả loại khách' },
  { value: 'to_chuc', label: 'Tổ chức' },
  { value: 'ca_nhan', label: 'Cá nhân' },
  { value: 'dai_ly', label: 'Đại lý' },
  { value: 'xuat_khau', label: 'Xuất khẩu' },
];

const TRANG_THAI_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'hoat_dong', label: 'Hoạt động' },
  { value: 'tam_khoa', label: 'Tạm khóa' },
  { value: 'ngung_giao_dich', label: 'Ngừng giao dịch' },
];

const formatCurrency = (val: string | number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
};

const columns: TableColumn<CustomerRow>[] = [
  {
    key: 'ma_khach_hang',
    header: 'Mã khách',
    width: proportional(1),
    renderCell: (item) => (
      <Link href={`/customers/${item.id}`} weight="semibold">
        {item.ma_khach_hang}
      </Link>
    ),
  },
  {
    key: 'ten_khach_hang',
    header: 'Tên khách hàng',
    width: proportional(2),
    renderCell: (item) => <Text type="label">{item.ten_khach_hang}</Text>,
  },
  { key: 'loai_khach_hang', header: 'Loại', width: proportional(1) },
  { key: 'so_dien_thoai', header: 'Số điện thoại', width: proportional(1) },
  { key: 'tinh_thanh_pho', header: 'Tỉnh/Thành', width: proportional(1) },
  {
    key: 'han_muc_cong_no',
    header: 'Hạn mức công nợ',
    width: proportional(1),
    align: 'end',
    renderCell: (item) => <Text hasTabularNumbers>{formatCurrency(item.han_muc_cong_no)}</Text>,
  },
  {
    key: 'trang_thai',
    header: 'Trạng thái',
    width: pixel(150),
    renderCell: (item) => <StatusBadge status={item.trang_thai} />,
  },
  {
    key: 'actions',
    header: 'Thao tác',
    width: pixel(110),
    align: 'end',
    renderCell: (item) => (
      <Link href={`/customers/${item.id}`} weight="medium">
        Chi tiết
      </Link>
    ),
  },
];

export const CustomerListPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [loaiKhachHang, setLoaiKhachHang] = useState<CustomerType | ''>('');
  const [trangThai, setTrangThai] = useState<CustomerStatus | ''>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCustomers({
        page,
        pageSize,
        search: search.trim() || undefined,
        loai_khach_hang: loaiKhachHang || undefined,
        trang_thai: trangThai || undefined,
      });
      setCustomers(res.customers);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [page, loaiKhachHang, trangThai]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchList();
  };

  return (
    <PageScaffold
      title="Quản lý khách hàng"
      subtitle={`Tổng số ${total} khách hàng trong hệ thống`}
      actions={
        <Button
          label="Thêm khách hàng mới"
          variant="primary"
          icon={<Plus size={16} />}
          href="/customers/new"
        />
      }
    >
      <DataTableCard<CustomerRow>
        label="Danh sách khách hàng"
        data={customers}
        columns={columns}
        idKey="id"
        isLoading={loading}
        error={error}
        onRetry={fetchList}
        emptyTitle="Không tìm thấy khách hàng nào"
        emptyDescription="Thử thay đổi bộ lọc tìm kiếm hoặc tạo mới khách hàng."
        pagination={{ page, totalPages, totalItems: total, pageSize, onChange: setPage }}
        rowIndexStart={(page - 1) * pageSize + 1}
        rowCount={total}
        toolbar={
          <form onSubmit={handleSearchSubmit}>
            <HStack gap={2} vAlign="end" wrap="wrap">
              <TextInput
                label="Tìm kiếm khách hàng"
                placeholder="Tìm theo mã, tên, số điện thoại, MST..."
                value={search}
                onChange={setSearch}
                width={320}
              />
              <Button type="submit" label="Tìm kiếm" variant="secondary" />
            </HStack>
          </form>
        }
        toolbarEnd={
          <HStack gap={2} vAlign="end" wrap="wrap">
            <Selector
              label="Loại khách hàng"
              options={LOAI_KHACH_OPTIONS}
              value={loaiKhachHang}
              onChange={(value) => {
                setLoaiKhachHang(value as CustomerType | '');
                setPage(1);
              }}
              width={190}
            />
            <Selector
              label="Trạng thái"
              options={TRANG_THAI_OPTIONS}
              value={trangThai}
              onChange={(value) => {
                setTrangThai(value as CustomerStatus | '');
                setPage(1);
              }}
              width={190}
            />
          </HStack>
        }
      />
    </PageScaffold>
  );
};
