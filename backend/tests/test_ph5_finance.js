/**
 * Comprehensive Test Suite for ERP May 10 - PH5: Tài chính – Kế toán & Giá thành
 * Verifies all 12 mandatory integration criteria:
 * 1. Unauthorized access rejection (401)
 * 2. Forbidden access rejection for non-accounting roles (403 for sales/warehouse)
 * 3. Accountant (ke_toan) access granted to documents, journals, debts, costing
 * 4. Chief Accountant (ke_toan_truong) access granted
 * 5. Document filters and listing
 * 6. Create document (chung_tu_goc)
 * 7. Journal filters and listing
 * 8. Debts listing (receivable & payable)
 * 9. Costs listing & aggregate (chi phí NVL từ kho)
 * 10. Costing calculation & listing (giá thành từ LSX & xuất kho)
 * 11. Order efficiency report
 * 12. Financial reports income statement & filters
 */

const http = require('http');
const db = require('../src/config/database');
const { signToken } = require('../src/middlewares/auth');

let server;
const PORT = 5125;

function request(path, method = 'GET', data = null, token = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    }

    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runAllFinanceTests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU BỘ KIỂM THỬ TOÀN DIỆN PH5 (TÀI CHÍNH - KẾ TOÁN & GIÁ THÀNH)');
  console.log('================================================================\n');

  const app = require('../src/app');
  server = app.listen(PORT);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      failed++;
      console.error(`  ❌ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  // Tokens
  const tokenKeToan = signToken(6);        // Hoàng Thị Toán (ke_toan)
  const tokenKeToanTruong = signToken(7);  // Nguyễn Văn Trưởng (ke_toan_truong)
  const tokenAdmin = signToken(1);         // Quản trị viên (admin)
  const tokenSales = signToken(2);         // Kinh doanh (ban_hang - Không có quyền kế toán)
  const tokenKho = signToken(5);           // Thủ kho (kho - Không có quyền kế toán)

  try {
    // -------------------------------------------------------------------------
    // TEST 1: UNAUTHORIZED (Chưa đăng nhập -> 401)
    // -------------------------------------------------------------------------
    console.log('--- Test 1: Từ chối truy cập khi không có token (401 Unauthorized) ---');
    const res1 = await request('/api/documents');
    assert(res1.status === 401 || res1.status === 403, `HTTP status trả về mã từ chối: ${res1.status}`);

    // -------------------------------------------------------------------------
    // TEST 2: FORBIDDEN (Vai trò không có quyền kế toán -> 403 Forbidden)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 2: Từ chối truy cập đối với vai trò không thuộc kế toán (403 Forbidden) ---');
    const res2a = await request('/api/documents', 'GET', null, tokenSales);
    assert(res2a.status === 403, `Sales token bị từ chối truy cập /api/documents (403): ${res2a.status}`);

    const res2b = await request('/api/debts', 'GET', null, tokenKho);
    assert(res2b.status === 403, `Kho token bị từ chối truy cập /api/debts (403): ${res2b.status}`);

    // -------------------------------------------------------------------------
    // TEST 3: KE TOAN ACCESS (Vai trò ke_toan truy cập hợp lệ -> 200 OK)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 3: Kế toán viên (ke_toan) truy cập danh sách chứng từ thành công ---');
    const res3 = await request('/api/documents?page=1&pageSize=10', 'GET', null, tokenKeToan);
    assert(res3.status === 200, `Kế toán truy cập /api/documents thành công: ${res3.status}`);
    assert(res3.data && Array.isArray(res3.data.data), 'Cấu trúc dữ liệu chứng từ trả về mảng data');

    // -------------------------------------------------------------------------
    // TEST 4: KE TOAN TRUONG ACCESS (Vai trò ke_toan_truong truy cập hợp lệ -> 200 OK)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 4: Kế toán trưởng (ke_toan_truong) truy cập thành công ---');
    const res4 = await request('/api/documents?page=1&pageSize=10', 'GET', null, tokenKeToanTruong);
    assert(res4.status === 200, `Kế toán trưởng truy cập /api/documents thành công: ${res4.status}`);

    // -------------------------------------------------------------------------
    // TEST 5: DOCUMENT FILTERS & DETAIL
    // -------------------------------------------------------------------------
    console.log('\n--- Test 5: Lấy bộ lọc chứng từ gốc ---');
    const res5 = await request('/api/documents/filters', 'GET', null, tokenKeToan);
    assert(res5.status === 200, `Lấy bộ lọc chứng từ thành công (200): ${res5.status}`);
    assert(res5.data && Array.isArray(res5.data.types), 'Bộ lọc trả về danh sách types');

    // -------------------------------------------------------------------------
    // TEST 6: CREATE DOCUMENT (Tạo chứng từ gốc mới)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 6: Tạo chứng từ gốc mới (chung_tu_goc) ---');
    const uniqueDocCode = `CT-TEST-${Date.now().toString().slice(-6)}`;
    const newDocPayload = {
      ma_chung_tu: uniqueDocCode,
      loai_chung_tu: 'phieu_thu',
      ngay_chung_tu: new Date().toISOString(),
      so_tien: '15000000.00',
      mo_ta: 'Thu tiền tạm ứng đơn hàng kiểm thử tích hợp PH5',
      file_dinh_kem: null,
    };
    const res6 = await request('/api/documents', 'POST', newDocPayload, tokenKeToan);
    assert(res6.status === 201, `Tạo chứng từ gốc mới trả về 201 Created: ${res6.status}`);
    assert(res6.data && res6.data.data && res6.data.data.ma_chung_tu === uniqueDocCode, `Chứng từ tạo thành công với mã ${uniqueDocCode}`);
    const createdDocId = res6.data?.data?.id;

    // -------------------------------------------------------------------------
    // TEST 7: JOURNALS LIST & FILTERS (Sổ nhật ký hạch toán)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 7: Sổ nhật ký hạch toán (nhat_ky_hach_toan) ---');
    const res7a = await request('/api/journals/filters', 'GET', null, tokenKeToan);
    assert(res7a.status === 200, `Lấy bộ lọc sổ nhật ký thành công: ${res7a.status}`);
    assert(res7a.data && Array.isArray(res7a.data.accounts), 'Bộ lọc trả về danh mục tài khoản kế toán');

    const res7b = await request('/api/journals?page=1&pageSize=10', 'GET', null, tokenKeToan);
    assert(res7b.status === 200, `Lấy danh sách nhật ký hạch toán thành công: ${res7b.status}`);

    // -------------------------------------------------------------------------
    // TEST 8: DEBTS (Công nợ phải thu & phải trả)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 8: Quản lý công nợ (cong_no) ---');
    const res8a = await request('/api/debts/filters', 'GET', null, tokenKeToan);
    assert(res8a.status === 200, `Lấy bộ lọc công nợ thành công: ${res8a.status}`);

    const res8b = await request('/api/debts?page=1&pageSize=10', 'GET', null, tokenKeToan);
    assert(res8b.status === 200, `Lấy danh sách công nợ thành công: ${res8b.status}`);
    assert(res8b.data && res8b.data.summary !== undefined, 'Dữ liệu công nợ có kèm bảng tổng hợp summary');

    // -------------------------------------------------------------------------
    // TEST 9: COSTS (Tập hợp chi phí sản xuất từ xuất kho NPL PH4)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 9: Tập hợp chi phí sản xuất (liên kết PH4 Quản lý kho) ---');
    const res9a = await request('/api/costs/filters', 'GET', null, tokenKeToan);
    assert(res9a.status === 200, `Lấy bộ lọc chi phí thành công: ${res9a.status}`);

    const res9b = await request('/api/costs?page=1&pageSize=10', 'GET', null, tokenKeToan);
    assert(res9b.status === 200, `Lấy danh sách chi phí tập hợp thành công: ${res9b.status}`);

    // -------------------------------------------------------------------------
    // TEST 10: COSTING (Tính giá thành sản phẩm từ Lệnh sản xuất PH2 & Kho PH4)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 10: Bảng tính giá thành sản phẩm (gia_thanh_san_pham) ---');
    const res10a = await request('/api/costing/filters', 'GET', null, tokenKeToan);
    assert(res10a.status === 200, `Lấy bộ lọc giá thành thành công: ${res10a.status}`);

    const res10b = await request('/api/costing?page=1&pageSize=10', 'GET', null, tokenKeToan);
    assert(res10b.status === 200, `Lấy danh sách giá thành thành công: ${res10b.status}`);

    // -------------------------------------------------------------------------
    // TEST 11: ORDER EFFICIENCY (Hiệu quả đơn hàng - Doanh thu vs Chi phí)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 11: Phân tích hiệu quả đơn hàng (Order Efficiency) ---');
    const res11a = await request('/api/order-efficiency/filters', 'GET', null, tokenKeToanTruong);
    assert(res11a.status === 200, `Lấy bộ lọc hiệu quả đơn hàng thành công: ${res11a.status}`);

    const res11b = await request('/api/order-efficiency?page=1&pageSize=10', 'GET', null, tokenKeToanTruong);
    assert(res11b.status === 200, `Lấy danh sách hiệu quả đơn hàng thành công: ${res11b.status}`);

    // -------------------------------------------------------------------------
    // TEST 12: FINANCIAL REPORTS (Báo cáo tài chính P&L / Kết quả kinh doanh)
    // -------------------------------------------------------------------------
    console.log('\n--- Test 12: Báo cáo tài chính & Kết quả kinh doanh ---');
    const res12a = await request('/api/financial-reports/filters', 'GET', null, tokenKeToanTruong);
    assert(res12a.status === 200, `Lấy danh mục kỳ báo cáo tài chính thành công: ${res12a.status}`);

    const res12b = await request('/api/financial-reports/snapshots', 'GET', null, tokenKeToanTruong);
    assert(res12b.status === 200, `Lấy snapshots báo cáo tài chính thành công: ${res12b.status}`);

    // Cleanup created test document if needed
    if (createdDocId) {
      console.log(`\n🧹 Dọn dẹp chứng từ kiểm thử id = ${createdDocId}...`);
      await request(`/api/documents/${createdDocId}`, 'DELETE', null, tokenKeToan);
    }

  } catch (err) {
    console.error('Lỗi ngoại lệ trong quá trình chạy kiểm thử:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    console.log('\n================================================================');
    console.log(`🏁 KẾT QUẢ KIỂM THỬ PH5: ${passed} PASS, ${failed} FAIL`);
    console.log('================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runAllFinanceTests();
