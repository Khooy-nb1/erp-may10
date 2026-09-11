// Temporary scoped SSR smoke check — deleted after the run.
import { createServer } from 'vite';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const results = [];
try {
  const { LinkProvider } = await server.ssrLoadModule('@astryxdesign/core/Link');
  const { Text } = await server.ssrLoadModule('@astryxdesign/core/Text');
  const { Link } = await server.ssrLoadModule('@astryxdesign/core/Link');
  const { Table, proportional, pixel } = await server.ssrLoadModule('@astryxdesign/core/Table');
  const { RouterLink } = await server.ssrLoadModule('/src/components/common/RouterLink.tsx');
  const { DataTableCard } = await server.ssrLoadModule('/src/components/common/DataTableCard.tsx');
  const { StatusBadge } = await server.ssrLoadModule('/src/components/common/StatusBadge.tsx');
  const { CustomerListPage } = await server.ssrLoadModule('/src/pages/customers/CustomerListPage.tsx');
  const { ProductListPage } = await server.ssrLoadModule('/src/pages/products/ProductListPage.tsx');

  const wrap = (node) => h(MemoryRouter, null, h(LinkProvider, { component: RouterLink }, node));

  const customerHtml = renderToStaticMarkup(wrap(h(CustomerListPage)));
  const productHtml = renderToStaticMarkup(wrap(h(ProductListPage)));

  const check = (name, html, needles) => {
    for (const needle of needles) {
      results.push(`${html.includes(needle) ? 'PASS' : 'FAIL'}  ${name}  "${needle}"`);
    }
  };

  check('CustomerListPage', customerHtml, [
    'Quản lý khách hàng',
    'Tổng số 0 khách hàng trong hệ thống',
    'Thêm khách hàng mới',
    'Tìm theo mã, tên, số điện thoại, MST...',
    'Tìm kiếm',
    'Loại khách hàng',
    'Tất cả loại khách',
    'Tất cả trạng thái',
    '/customers/new',
  ]);
  check('ProductListPage', productHtml, [
    'Tra cứu sản phẩm may mặc',
    'Danh mục sản phẩm kinh doanh (0 sản phẩm)',
    'Tìm theo mã sản phẩm hoặc tên hàng...',
    'Kích cỡ',
    'Tất cả kích cỡ',
    'Màu sắc',
    'Màu Đen',
    'Cái',
  ]);

  // Data-driven table path (rows, links, badges, pagination) with the same column
  // shape the two list pages declare.
  const rows = [
    { id: 1, ma_khach_hang: 'KH001', ten_khach_hang: 'Công ty A', han_muc_cong_no: '1000000', trang_thai: 'hoat_dong' },
    { id: 2, ma_khach_hang: 'KH002', ten_khach_hang: 'Công ty B', han_muc_cong_no: '0', trang_thai: 'tam_khoa' },
  ];
  const columns = [
    { key: 'ma_khach_hang', header: 'Mã khách', width: proportional(1), renderCell: (i) => h(Link, { href: `/customers/${i.id}`, weight: 'semibold' }, i.ma_khach_hang) },
    { key: 'ten_khach_hang', header: 'Tên khách hàng', width: proportional(2), renderCell: (i) => h(Text, { type: 'label' }, i.ten_khach_hang) },
    { key: 'han_muc_cong_no', header: 'Hạn mức công nợ', width: proportional(1), align: 'end', renderCell: (i) => h(Text, { hasTabularNumbers: true }, i.han_muc_cong_no) },
    { key: 'trang_thai', header: 'Trạng thái', width: pixel(150), renderCell: (i) => h(StatusBadge, { status: i.trang_thai }) },
    { key: 'actions', header: 'Thao tác', width: pixel(110), align: 'end', renderCell: (i) => h(Link, { href: `/customers/${i.id}`, weight: 'medium' }, 'Chi tiết') },
  ];
  const tableHtml = renderToStaticMarkup(
    wrap(
      h(DataTableCard, {
        label: 'Danh sách khách hàng',
        data: rows,
        columns,
        idKey: 'id',
        pagination: { page: 1, totalPages: 3, totalItems: 25, pageSize: 10, onChange: () => {} },
        rowIndexStart: 1,
        rowCount: 25,
      }),
    ),
  );
  check('DataTableCard', tableHtml, [
    'Mã khách',
    'Tên khách hàng',
    'Hạn mức công nợ',
    'Thao tác',
    'Chi tiết',
    'Hoạt động',
    'Tạm khóa',
    'href="/customers/2"',
  ]);
  results.push(`INFO  DataTableCard rendered ${(tableHtml.match(/<tr/g) || []).length} tr elements`);
  results.push(`INFO  pagination rendered: ${tableHtml.includes('Total') || /aria-label="[^"]*[Pp]agination/.test(tableHtml)}`);
  void Table;
} catch (error) {
  results.push(`ERROR ${error && error.stack ? error.stack.split('\n').slice(0, 6).join('\n      ') : error}`);
} finally {
  await server.close();
}
console.log(results.join('\n'));
