import React, { useState, useEffect } from 'react';
import { Text } from '../../components/ui/Typography.js';
import { Select } from '../../components/ui/Select.js';
import { proportional, pixel, type TableColumn } from '../../components/ui/Table.js';
import { Product, ProductStatus } from '../../types/product.js';
import { getProducts } from '../../services/productService.js';
import { formatCurrency } from '../../lib/format.js';
import { PageScaffold } from '../../components/common/PageScaffold.js';
import { DataTableCard } from '../../components/common/DataTableCard.js';
import { FilterBar } from '../../components/common/FilterBar.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';

/**
 * Columns this screen reads off `Product`. Declared as an object type alias so
 * the API payload can be handed to the table as-is, without re-mapping rows.
 */
type ProductRow = {
  id: number;
  ma_san_pham: string;
  ten_san_pham: string;
  size: string | null;
  mau_sac: string | null;
  ten_don_vi?: string | null;
  gia_ban: string | number;
  trang_thai: ProductStatus;
};

const SIZE_OPTIONS = [
  { value: '', label: 'Tất cả kích cỡ' },
  { value: 'S', label: 'Size S' },
  { value: 'M', label: 'Size M' },
  { value: 'L', label: 'Size L' },
  { value: 'XL', label: 'Size XL' },
  { value: 'XXL', label: 'Size XXL' },
];

const MAU_SAC_OPTIONS = [
  { value: '', label: 'Tất cả màu sắc' },
  { value: 'Trắng', label: 'Màu Trắng' },
  { value: 'Xanh pastel', label: 'Xanh pastel' },
  { value: 'Đen', label: 'Màu Đen' },
];

const TRANG_THAI_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'dang_ban', label: 'Đang bán' },
  { value: 'mau_moi', label: 'Mẫu mới' },
  { value: 'ngung_ban', label: 'Ngừng bán' },
];

const columns: TableColumn<ProductRow>[] = [
  {
    key: 'ma_san_pham',
    header: 'Mã sản phẩm',
    width: proportional(1),
    renderCell: (item) => <Text variant="label">{item.ma_san_pham}</Text>,
  },
  {
    key: 'ten_san_pham',
    header: 'Tên sản phẩm',
    width: proportional(2),
    renderCell: (item) => (
      <span className="block max-w-[280px] truncate" title={item.ten_san_pham}>
        <Text variant="label">{item.ten_san_pham}</Text>
      </span>
    ),
  },
  { key: 'size', header: 'Kích cỡ', width: proportional(1), renderCell: (item) => item.size || '—' },
  { key: 'mau_sac', header: 'Màu sắc', width: proportional(1), renderCell: (item) => item.mau_sac || '—' },
  {
    key: 'ten_don_vi',
    header: 'Đơn vị tính',
    width: proportional(1),
    renderCell: (item) => item.ten_don_vi || 'Cái',
  },
  {
    key: 'gia_ban',
    header: 'Giá bán niêm yết',
    width: proportional(1),
    align: 'end',
    renderCell: (item) => (
      <Text variant="label" className="tabular-nums">
        {formatCurrency(item.gia_ban)}
      </Text>
    ),
  },
  {
    key: 'trang_thai',
    header: 'Trạng thái',
    width: pixel(140),
    align: 'start',
    renderCell: (item) => <StatusBadge status={item.trang_thai} />,
  },
];

export const ProductListPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [size, setSize] = useState<string>('');
  const [mauSac, setMauSac] = useState<string>('');
  const [trangThai, setTrangThai] = useState<ProductStatus | ''>('dang_ban');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  // The search term is submit-triggered, so it is not an effect dependency;
  // this token lets "Xóa bộ lọc" refetch when it cleared the search alone.
  const [reloadToken, setReloadToken] = useState<number>(0);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProducts({
        page,
        pageSize,
        search: search.trim() || undefined,
        size: size.trim() || undefined,
        mau_sac: mauSac.trim() || undefined,
        trang_thai: trangThai || undefined,
      });
      setProducts(res.products);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh mục sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [page, size, mauSac, trangThai, reloadToken]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchList();
  };

  // 'Đang bán' is this screen's default view, so resetting restores it rather
  // than switching to every status.
  const isFiltered = Boolean(search.trim() || size || mauSac || trangThai !== 'dang_ban');

  return (
    <PageScaffold
      title="Tra cứu sản phẩm may mặc"
      subtitle={`Danh mục sản phẩm kinh doanh (${total} sản phẩm)`}
    >
      <DataTableCard<ProductRow>
        label="Danh mục sản phẩm"
        data={products}
        columns={columns}
        idKey="id"
        density="compact"
        isLoading={loading}
        error={error}
        onRetry={fetchList}
        emptyTitle="Không tìm thấy sản phẩm nào"
        emptyDescription="Thử thay đổi từ khóa hoặc điều kiện lọc."
        pagination={{ page, totalPages, totalItems: total, pageSize, onChange: setPage }}
        rowIndexStart={(page - 1) * pageSize + 1}
        rowCount={total}
        toolbar={
          <FilterBar
            label="Bộ lọc danh mục sản phẩm"
            search={{
              label: 'Tìm kiếm sản phẩm',
              placeholder: 'Tìm theo mã sản phẩm hoặc tên hàng...',
              value: search,
              onChange: setSearch,
              widthClassName: 'w-full sm:w-80',
            }}
            onSubmit={handleSearchSubmit}
            filters={
              <>
                <Select
                  label="Kích cỡ"
                  options={SIZE_OPTIONS}
                  value={size}
                  onChange={(value) => {
                    setSize(value);
                    setPage(1);
                  }}
                  className="w-full sm:w-48"
                />
                <Select
                  label="Màu sắc"
                  options={MAU_SAC_OPTIONS}
                  value={mauSac}
                  onChange={(value) => {
                    setMauSac(value);
                    setPage(1);
                  }}
                  className="w-full sm:w-48"
                />
                <Select
                  label="Trạng thái"
                  options={TRANG_THAI_OPTIONS}
                  value={trangThai}
                  onChange={(value) => {
                    setTrangThai(value as ProductStatus | '');
                    setPage(1);
                  }}
                  className="w-full sm:w-48"
                />
              </>
            }
            isFiltered={isFiltered}
            onReset={() => {
              setSearch('');
              setSize('');
              setMauSac('');
              setTrangThai('dang_ban');
              setPage(1);
              setReloadToken((token) => token + 1);
            }}
          />
        }
      />
    </PageScaffold>
  );
};
