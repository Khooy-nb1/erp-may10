import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Text } from '../components/ui/Typography.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Select } from '../components/ui/Select.jsx';
import { TextLink } from '../components/ui/TextLink.jsx';
import { proportional, pixel } from '../components/ui/Table.jsx';
import { getInvoices } from '../services/invoiceService.js';
import { PageScaffold } from '../components/common/PageScaffold.jsx';
import { DataTableCard } from '../components/common/DataTableCard.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { FilterBar } from '../components/common/FilterBar.jsx';
import { InvoiceCreateDialog } from '../components/invoices/InvoiceCreateDialog.jsx';
import { useAuth } from '../../components/rbac/AuthContext.jsx';
import { FINANCE_ROLES, hasAnyRole } from '../config/permissions.js';
import { formatCurrency, formatDate } from '../lib/format.js';

/**
 * Sales invoices (PH1 \`pages/invoices/InvoiceListPage.tsx\`, ported 1:1 for Step 6H).
 * Invoice creation stays in the module's dialog; in-module links live under \`/sales\`.
 */

const TRANG_THAI_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'chua_thanh_toan', label: 'Chưa thanh toán' },
  { value: 'thanh_toan_mot_phan', label: 'Thanh toán một phần' },
  { value: 'da_thanh_toan', label: 'Đã thanh toán' },
  { value: 'qua_han', label: 'Quá hạn' },
];

const columns = [
  {
    key: 'ma_hoa_don',
    header: 'Mã hóa đơn',
    width: proportional(1),
    renderCell: (item) => (
      <TextLink to={'/sales/invoices/' + item.id} weight="semibold">
        {item.ma_hoa_don}
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
    key: 'ten_khach_hang',
    header: 'Khách hàng',
    width: proportional(2),
    renderCell: (item) => (
      <span
        className="block max-w-[280px] truncate"
        title={item.ten_khach_hang || 'Mã #' + item.ma_khach_hang}
      >
        {item.ten_khach_hang || 'Mã #' + item.ma_khach_hang}
      </span>
    ),
  },
  {
    key: 'ngay_xuat_hoa_don',
    header: 'Ngày xuất',
    width: pixel(120),
    renderCell: (item) => <Text variant="supporting">{formatDate(item.ngay_xuat_hoa_don)}</Text>,
  },
  {
    key: 'ngay_dao_han',
    header: 'Ngày đáo hạn',
    width: pixel(130),
    renderCell: (item) => <Text variant="supporting">{formatDate(item.ngay_dao_han)}</Text>,
  },
  {
    key: 'tong_tien_sau_thue',
    header: 'Tổng thanh toán',
    width: pixel(160),
    align: 'end',
    renderCell: (item) => (
      <Text variant="label" className="tabular-nums">
        {formatCurrency(item.tong_tien_sau_thue)}
      </Text>
    ),
  },
  {
    key: 'so_tien_da_thu',
    header: 'Đã thu',
    width: pixel(150),
    align: 'end',
    renderCell: (item) => <Text className="tabular-nums">{formatCurrency(item.so_tien_da_thu)}</Text>,
  },
  {
    key: 'trang_thai',
    header: 'Trạng thái',
    width: pixel(150),
    align: 'start',
    renderCell: (item) => <StatusBadge status={item.trang_thai} />,
  },
];

export function InvoiceListPage() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const canCreateInvoice = hasAnyRole(user, FINANCE_ROLES);

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
  }, [page, trangThai, reloadToken]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchList();
  };

  return (
    <PageScaffold
      title="Quản lý hóa đơn bán hàng"
      subtitle={'Theo dõi xuất hóa đơn và tình trạng thanh toán (' + total + ' hóa đơn)'}
      actions={
        canCreateInvoice ? (
          <Button variant="primary" icon={<Plus size={16} aria-hidden />} onClick={() => setCreateOpen(true)}>
            Xuất hóa đơn mới
          </Button>
        ) : undefined
      }
    >
      <DataTableCard
        label="Danh sách hóa đơn bán hàng"
        data={invoices}
        columns={columns}
        idKey="id"
        density="compact"
        isLoading={loading}
        error={error}
        onRetry={fetchList}
        emptyTitle="Không tìm thấy hóa đơn nào"
        emptyDescription="Thử thay đổi bộ lọc tìm kiếm hoặc tạo mới hóa đơn từ đơn hàng đã xác nhận."
        pagination={{ page, totalPages, totalItems: total, pageSize, onChange: setPage }}
        rowIndexStart={(page - 1) * pageSize + 1}
        rowCount={total}
        toolbar={
          <FilterBar
            label="Bộ lọc danh sách hóa đơn bán hàng"
            search={{
              label: 'Tìm kiếm hóa đơn',
              placeholder: 'Tìm theo mã hóa đơn hoặc tên khách hàng...',
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

      {canCreateInvoice && (
        <InvoiceCreateDialog
          isOpen={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(id) => navigate('/sales/invoices/' + id)}
        />
      )}
    </PageScaffold>
  );
}
