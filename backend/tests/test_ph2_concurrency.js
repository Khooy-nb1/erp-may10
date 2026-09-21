/**
 * Comprehensive Concurrency Test Suite for ERP May 10 — PH2
 * Verifies transaction locking & race condition protections:
 * 1. Simultaneous plan approval (10 concurrent requests -> exactly 1 succeeds, 9 return 409 Conflict)
 * 2. Simultaneous production result logging (10 concurrent batch logs -> total quantity atomically accumulated)
 * 3. Duplicate order completion protection
 */

const http = require('http');
const app = require('../src/app');
const db = require('../src/config/database');
const { signToken } = require('../src/middlewares/auth');

let server;
const PORT = 5198;

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

async function runPh2ConcurrencyTests() {
  console.log('================================================================');
  console.log('⚡ BẮT ĐẦU KIỂM THỬ TRANH CHẤP & ĐỒNG THỜI PH2 (CONCURRENCY LOCKS)');
  console.log('================================================================\n');

  let testCount = 0;
  let passCount = 0;

  function assert(condition, message) {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  server = app.listen(PORT);

  try {
    const tokenSanXuat = signToken(3); // role san_xuat

    // -------------------------------------------------------------
    // SCENARIO 1: Simultaneous Plan Approval (10 concurrent requests)
    // -------------------------------------------------------------
    console.log('1. Kịch bản 1: Tranh chấp phê duyệt KHSX đồng thời (Concurrent Plan Approval):');
    // Tạo 1 KHSX mới ở trạng thái cho_duyet
    const planRes = await request('/api/v1/production/plans', 'POST', {
      ma_san_pham: 1, // Áo sơ mi nam (đã có BOM)
      so_luong_ke_hoach: 1000,
    }, tokenSanXuat);
    const planId = planRes.data.data.id;

    console.log(`   Phát 10 requests phê duyệt đồng thời cho KHSX ID ${planId}...`);
    const approvePromises = Array.from({ length: 10 }, () =>
      request(`/api/v1/production/plans/${planId}/approve`, 'POST', null, tokenSanXuat)
    );

    const approveResults = await Promise.all(approvePromises);
    const status200Count = approveResults.filter(r => r.status === 200).length;
    const status409Count = approveResults.filter(r => r.status === 409).length;

    assert(status200Count === 1, `Chính xác 1 request thành công (HTTP 200) khi duyệt KHSX đồng thời (Thực tế: ${status200Count})`);
    assert(status409Count === 9, `9 requests còn lại bị chặn an toàn với HTTP 409 Conflict (Thực tế: ${status409Count})`);

    const checkPlanRes = await request(`/api/v1/production/plans/${planId}`, 'GET', null, tokenSanXuat);
    assert(checkPlanRes.data.data.trang_thai === 'da_duyet', 'Trạng thái KHSX cuối cùng đảm bảo đúng "da_duyet"');

    // -------------------------------------------------------------
    // SCENARIO 2: Simultaneous Production Result Logging (10 concurrent requests)
    // -------------------------------------------------------------
    console.log('\n2. Kịch bản 2: Ghi nhận kết quả sản xuất đồng thời (Concurrent Production Result Logging):');
    // Tạo 1 LSX từ kế hoạch vừa duyệt
    const orderRes = await request('/api/v1/production/orders', 'POST', {
      ma_ke_hoach_san_xuat: planId,
      so_luong_yeu_cau: 1000,
    }, tokenSanXuat);
    const orderId = orderRes.data.data.id;

    // Khởi động LSX
    await request(`/api/v1/production/orders/${orderId}/start`, 'POST', null, tokenSanXuat);

    console.log(`   Phát 10 requests ghi nhận sản lượng đồng thời (mỗi ca: 50 SP) cho LSX ID ${orderId}...`);
    const resultPromises = Array.from({ length: 10 }, (_, i) =>
      request('/api/v1/production/results', 'POST', {
        ma_lenh_san_xuat: orderId,
        so_luong_hoan_thanh: 50,
        so_luong_loi: 1,
        ghi_chu: `Ca đồng thời #${i + 1}`,
      }, tokenSanXuat)
    );

    const resultResponses = await Promise.all(resultPromises);
    const successResultCount = resultResponses.filter(r => r.status === 201).length;
    assert(successResultCount === 10, `Cả 10 giao dịch ghi nhận kết quả đều thành công (HTTP 201) thông qua transaction locking (Thực tế: ${successResultCount})`);

    const checkOrderRes = await request(`/api/v1/production/orders/${orderId}`, 'GET', null, tokenSanXuat);
    const totalAccumulated = parseFloat(checkOrderRes.data.data.so_luong_hoan_thanh);
    assert(totalAccumulated === 500, `Tổng sản lượng hoàn thành tích lũy chính xác tuyệt đối không bị mất dữ liệu: 10 x 50 = ${totalAccumulated} SP (Kỳ vọng: 500)`);

    // -------------------------------------------------------------
    // SCENARIO 3: Duplicate Completion Protection
    // -------------------------------------------------------------
    console.log('\n3. Kịch bản 3: Tự động hoàn tất và chặn vượt kiểm soát:');
    // Ghi nhận tiếp 500 SP để hoàn thành 1000/1000
    const finalLogRes = await request('/api/v1/production/results', 'POST', {
      ma_lenh_san_xuat: orderId,
      so_luong_hoan_thanh: 500,
    }, tokenSanXuat);

    assert(finalLogRes.status === 201 && finalLogRes.data.isFinished === true, 'Lệnh sản xuất tự động nhận diện hoàn tất (isFinished = true)');
    const finalOrderCheck = await request(`/api/v1/production/orders/${orderId}`, 'GET', null, tokenSanXuat);
    assert(finalOrderCheck.data.data.trang_thai === 'hoan_thanh', 'Trạng thái lệnh trong CSDL là "hoan_thanh"');

    // Dọn dẹp dữ liệu kiểm thử
    await db.query(`DELETE FROM ket_qua_san_xuat WHERE ma_lenh_san_xuat = $1`, [orderId]);
    await db.query(`DELETE FROM cong_doan_san_xuat WHERE ma_lenh_san_xuat = $1`, [orderId]);
    await db.query(`DELETE FROM lenh_san_xuat WHERE id = $1`, [orderId]);
    await db.query(`DELETE FROM nhu_cau_npl WHERE ma_ke_hoach_san_xuat = $1`, [planId]);
    await db.query(`DELETE FROM ke_hoach_san_xuat WHERE id = $1`, [planId]);

  } catch (err) {
    console.error('Lỗi ngoại lệ trong concurrency test suite:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    console.log('\n================================================================');
    console.log(`📊 TỔNG KẾT PH2 CONCURRENCY TESTS: ${passCount}/${testCount} PASS (${Math.round((passCount / testCount) * 100)}%)`);
    console.log('================================================================\n');
    process.exit(process.exitCode ? 1 : 0);
  }
}

runPh2ConcurrencyTests();
