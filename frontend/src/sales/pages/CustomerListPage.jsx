import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Text } from '../components/ui/Typography.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Select } from '../components/ui/Select.jsx';
import { TextLink } from '../components/ui/TextLink.jsx';
import { proportional, pixel } from '../components/ui/Table.jsx';
import { getCustomers } from '../services/customerService.js';
import { PageScaffold } from '../components/common/PageScaffold.jsx';
import { DataTableCard } from '../components/common/DataTableCard.jsx';
import { FilterBar } from '../components/common/FilterBar.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { CustomerCreateDialog } from '../components/customers/CustomerCreateDialog.jsx';
import { formatCurrency } from '../lib/format.js';

/**
 * Customer registry (PH1 `pages/customers/CustomerListPage.tsx`, ported 1:1 for Step 6H).
 *
 * The columns read only the fields below off the row, so the API payload is
 * handed to the table as-is, without re-mapping rows. In-module links move under
 * Core's mount point (`/customers/:id` -> `/sales/customers/:id`).
 *
 * Core adaptation: customer creation opens `CustomerCreateDialog` instead of
 * navigating to `/sales/customers/new`, which now redirects back to this list.
 */

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

const columns = [
  {
    key: 'ma_khach_hang',
    header: 'Mã khách',
    width: proportional(1),
    renderCell: (item) => (
      <TextLink to={`/sales/customers/${item.id}`} weight="semibold">
        {item.ma_khach_hang}
      </TextLink>
    ),
  },
  {
    key: 'ten_khach_hang',
    header: 'Tên khách hàng',
    width: proportional(2),
    renderCell: (item) => (
      <span className="block max-w-[280px] truncate" title={item.ten_khach_hang}>
        <Text variant="label">{item.ten_khach_hang}</Text>
      </span>
    ),
  },
  { key: 'loai_khach_hang', header: 'Loại', width: proportional(1) },
  { key: 'so_dien_thoai', header: 'Số điện thoại', width: proportional(1) },
  {
    key: 'tinh_thanh_pho',
    header: 'Tỉnh/Thành',
    width: proportional(1),
    renderCell: (item) => (
      <span className="block max-w-[280px] truncate" title={item.tinh_thanh_pho}>
        {item.tinh_thanh_pho}
      </span>
    ),
  },
  {
    key: 'han_muc_cong_no',
    header: 'Hạn mức công nợ',
    width: proportional(1),
    align: 'end',
    renderCell: (item) => <Text className="tabular-nums">{formatCurrency(item.han_muc_cong_no)}</Text>,
  },
  {
    key: 'trang_thai',
    header: 'Trạng thái',
    width: pixel(150),
    renderCell: (item) => <StatusBadge status={item.trang_thai} />,
  },
];

export function CustomerListPage() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [loaiKhachHang, setLoaiKhachHang] = useState('');
  const [trangThai, setTrangThai] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  // "Xóa bộ lọc" must refetch even when only the search text changed: search is
  // submit-triggered and therefore not an effect dependency.
  const [reloadToken, setReloadToken] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  // Set while a successful create hands off to the detail route, so the close
  // that follows it does not refetch a list the page is leaving.
  const createdRef = useRef(false);

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
  }, [page, loaiKhachHang, trangThai, reloadToken]);

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
      title="Quản lý khách hàng"
      subtitle={`Tổng số ${total} khách hàng trong hệ thống`}
      actions={
        <Button
          variant="primary"
          icon={<Plus size={16} aria-hidden />}
          onClick={() => setCreateOpen(true)}
        >
          Thêm khách hàng mới
        </Button>
      }
    >
      <DataTableCard
        label="Danh sách khách hàng"
        data={customers}
        columns={columns}
        idKey="id"
        density="compact"
        isLoading={loading}
        error={error}
        onRetry={fetchList}
        emptyTitle="Không tìm thấy khách hàng nào"
        emptyDescription="Thử thay đổi bộ lọc tìm kiếm hoặc tạo mới khách hàng."
        pagination={{ page, totalPages, totalItems: total, pageSize, onChange: setPage }}
        rowIndexStart={(page - 1) * pageSize + 1}
        rowCount={total}
        toolbar={
          <FilterBar
            label="Bộ lọc danh sách khách hàng"
            search={{
              label: 'Tìm kiếm khách hàng',
              placeholder: 'Tìm theo mã, tên, số điện thoại, MST...',
              value: search,
              onChange: setSearch,
              widthClassName: 'w-full sm:w-80',
            }}
            onSubmit={handleSearchSubmit}
            filters={
              <>
                <Select
                  label="Loại khách hàng"
                  options={LOAI_KHACH_OPTIONS}
                  value={loaiKhachHang}
                  onChange={(value) => {
                    setLoaiKhachHang(value);
                    setPage(1);
                  }}
                  className="w-full sm:w-48"
                />
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
              </>
            }
            isFiltered={Boolean(search.trim() || loaiKhachHang || trangThai)}
            onReset={() => {
              setSearch('');
              setLoaiKhachHang('');
              setTrangThai('');
              setPage(1);
              setReloadToken((token) => token + 1);
            }}
          />
        }
      />

      <CustomerCreateDialog
        isOpen={createOpen}
        onOpenChange={handleCreateOpenChange}
        onCreated={(id) => {
          createdRef.current = true;
          navigate(`/sales/customers/${id}`);
        }}
      />
    </PageScaffold>
  );
}
