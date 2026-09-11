// Temporary scoped SSR structure dump — deleted after the run.
import { createServer } from 'vite';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const out = [];
try {
  const { LinkProvider } = await server.ssrLoadModule('@astryxdesign/core/Link');
  const { RouterLink } = await server.ssrLoadModule('/src/components/common/RouterLink.tsx');
  const { ProductListPage } = await server.ssrLoadModule('/src/pages/products/ProductListPage.tsx');
  const { CustomerListPage } = await server.ssrLoadModule('/src/pages/customers/CustomerListPage.tsx');
  const wrap = (node) => h(MemoryRouter, null, h(LinkProvider, { component: RouterLink }, node));

  const productHtml = renderToStaticMarkup(wrap(h(ProductListPage)));
  const customerHtml = renderToStaticMarkup(wrap(h(CustomerListPage)));

  out.push(`product: 'Đang bán' trigger text present = ${productHtml.includes('Đang bán')}`);
  out.push(`product: search label present = ${productHtml.includes('Tìm kiếm sản phẩm')}`);
  out.push(`product: 'Đang tải dữ liệu' loading announcement = ${productHtml.includes('Đang tải dữ liệu')}`);
  out.push(`product: 'Đang tải danh mục sản phẩm...' (old message) = ${productHtml.includes('Đang tải danh mục sản phẩm')}`);
  out.push(`customer: 'Đang tải dữ liệu' loading announcement = ${customerHtml.includes('Đang tải dữ liệu')}`);
  out.push(`customer: search label present = ${customerHtml.includes('Tìm kiếm khách hàng')}`);
  out.push(`customer: form element inside toolbar = ${/<form[^>]*>/.test(customerHtml)}`);
  out.push(`customer: empty-state text absent while loading = ${!customerHtml.includes('Không tìm thấy khách hàng nào')}`);
  out.push(`customer: pagination absent while loading = ${!customerHtml.includes('aria-label="Pagination"') && !/pagination/i.test(customerHtml)}`);

  const start = customerHtml.indexOf('Tìm kiếm khách hàng');
  out.push('--- customer toolbar excerpt ---');
  out.push(customerHtml.slice(Math.max(0, start - 420), start + 1500));
  const pstart = productHtml.indexOf('Kích cỡ');
  out.push('--- product filters excerpt ---');
  out.push(productHtml.slice(Math.max(0, pstart - 200), pstart + 700));
} catch (error) {
  out.push(`ERROR ${error && error.stack ? error.stack.split('\n').slice(0, 8).join('\n      ') : error}`);
} finally {
  await server.close();
}
console.log(out.join('\n'));
