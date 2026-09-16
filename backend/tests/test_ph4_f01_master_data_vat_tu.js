/**
 * TEST SUITE: PH4 F-01 — MASTER DATA VẬT TƯ (MATERIAL MASTER CRUD & RBAC)
 * Kiểm tra toàn diện 12 tiêu chí bắt buộc theo đặc tả kỹ thuật May 10
 */

const http = require('http');
const assert = require('assert');
const db = require('E:/ERP/backend/src/config/database');

const API_BASE = 'http://127.0.0.1:5000/api/v1';

function sendRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function login(email, password) {
  return sendRequest('POST', '/auth/login', { email, password });
}

async function runTests() {
  console.log('================================================================');
  console.log('TEST SUITE: PH4 F-01 — MASTER DATA VẬT TƯ (MATERIAL MASTER CRUD)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function recordPass(name, detail = '') {
    passed++;
    console.log(`  ✅ [PASS] ${name}${detail ? ' -> ' + detail : ''}`);
  }

  function recordFail(name, err) {
    failed++;
    console.error(`  ❌ [FAIL] ${name}:`, err.message || err);
  }

  try {
    // 0. Chuẩn bị tokens
    const adminLogin = await login('admin@may10.vn', 'Admin@123');
    assert(adminLogin.status === 200 && adminLogin.data.success, 'Admin login thất bại');
    const adminToken = adminLogin.data.data.token;

    const khoLogin = await login('kho@may10.vn', 'Admin@123');
    assert(khoLogin.status === 200 && khoLogin.data.success, 'Thủ kho login thất bại');
    const khoToken = khoLogin.data.data.token;

    const salesLogin = await login('banhang@may10.vn', 'Admin@123');
    assert(salesLogin.status === 200 && salesLogin.data.success, 'Bán hàng login thất bại');
    const salesToken = salesLogin.data.data.token;

    // Ghi nhận snapshot bảng ton_kho trước khi test (Tiêu chuẩn 12)
    const tonKhoBeforeRes = await db.query('SELECT ma_kho, ma_vat_tu, so_luong_ton FROM ton_kho ORDER BY ma_kho, ma_vat_tu');
    const tonKhoSnapshotBefore = JSON.stringify(tonKhoBeforeRes.rows);

    // -------------------------------------------------------------
    // TEST 1: GET danh sách vật tư -> PASS (200)
    // -------------------------------------------------------------
    try {
      const res = await sendRequest('GET', '/master-data/vat-tu');
      assert(res.status === 200 && res.data.success, `Kỳ vọng 200 nhưng nhận ${res.status}`);
      assert(Array.isArray(res.data.data) && res.data.data.length > 0, 'Dữ liệu vật tư không phải mảng hoặc rỗng');
      recordPass('TEST 1: GET danh sách vật tư thành công', `Tổng số vật tư: ${res.data.data.length}`);
    } catch (e) {
      recordFail('TEST 1: GET danh sách vật tư', e);
    }

    // -------------------------------------------------------------
    // TEST 2: POST tạo vật tư hợp lệ -> 201 Created
    // -------------------------------------------------------------
    const uniqueCode = `VT-TEST-${Date.now().toString().slice(-4)}`;
    let createdVtId = null;
    try {
      const res = await sendRequest(
        'POST',
        '/master-data/vat-tu',
        {
          ma_vat_tu: uniqueCode,
          ten_vat_tu: 'Vải Kaki May Áo Test F01',
          loai_vat_tu: 'vai_chinh',
          ma_don_vi_tinh: 2, // Mét
          quy_cach: 'Khổ 1.6m, 100% Cotton CVC',
          muc_ton_toi_thieu: 100,
          muc_ton_toi_da: 5000,
          gia_nhap_trung_binh: 75000,
          nha_cung_cap_chinh: 1,
        },
        khoToken
      );
      assert(res.status === 201 && res.data.success, `Kỳ vọng 201 Created nhưng nhận ${res.status}`);
      assert(res.data.data && res.data.data.id, 'Thiếu dữ liệu id vật tư mới');
      createdVtId = res.data.data.id;
      recordPass('TEST 2: POST tạo vật tư hợp lệ thành công (HTTP 201)', `ID: ${createdVtId}, Code: ${uniqueCode}`);
    } catch (e) {
      recordFail('TEST 2: POST tạo vật tư hợp lệ', e);
    }

    // -------------------------------------------------------------
    // TEST 3: POST duplicate ma_vat_tu -> 409 Conflict
    // -------------------------------------------------------------
    try {
      const res = await sendRequest(
        'POST',
        '/master-data/vat-tu',
        {
          ma_vat_tu: uniqueCode,
          ten_vat_tu: 'Vải Trùng Mã Test',
          loai_vat_tu: 'vai_chinh',
          ma_don_vi_tinh: 2,
        },
        khoToken
      );
      assert(res.status === 409, `Kỳ vọng 409 Conflict nhưng nhận ${res.status}`);
      assert(res.data.errorCode === 'ALREADY_EXISTS', `Kỳ vọng ALREADY_EXISTS nhưng nhận ${res.data.errorCode}`);
      recordPass('TEST 3: POST trùng lặp ma_vat_tu bị chặn với HTTP 409 ALREADY_EXISTS');
    } catch (e) {
      recordFail('TEST 3: POST duplicate ma_vat_tu', e);
    }

    // -------------------------------------------------------------
    // TEST 4: POST min > max -> 400 Bad Request
    // -------------------------------------------------------------
    try {
      const res = await sendRequest(
        'POST',
        '/master-data/vat-tu',
        {
          ma_vat_tu: `VT-ERR-${Date.now().toString().slice(-4)}`,
          ten_vat_tu: 'Vật Tư Sai Định Mức',
          loai_vat_tu: 'chi_may',
          ma_don_vi_tinh: 3,
          muc_ton_toi_thieu: 2000,
          muc_ton_toi_da: 500, // min > max
        },
        khoToken
      );
      assert(res.status === 400, `Kỳ vọng 400 Bad Request nhưng nhận ${res.status}`);
      assert(res.data.errorCode === 'VALIDATION_ERROR', `Kỳ vọng VALIDATION_ERROR nhưng nhận ${res.data.errorCode}`);
      recordPass('TEST 4: POST mức tồn tối thiểu > tối đa bị chặn với HTTP 400 VALIDATION_ERROR');
    } catch (e) {
      recordFail('TEST 4: POST min > max', e);
    }

    // -------------------------------------------------------------
    // TEST 5: PUT sửa vật tư -> 200 OK
    // -------------------------------------------------------------
    try {
      const res = await sendRequest(
        'PUT',
        `/master-data/vat-tu/${createdVtId}`,
        {
          ten_vat_tu: 'Vải Kaki May Áo Test F01 (Đã Cập Nhật)',
          quy_cach: 'Khổ 1.6m, màu Xanh Navy',
          muc_ton_toi_thieu: 150,
          muc_ton_toi_da: 6000,
          gia_nhap_trung_binh: 80000,
        },
        khoToken
      );
      assert(res.status === 200 && res.data.success, `Kỳ vọng 200 OK nhưng nhận ${res.status}`);
      assert(res.data.data.ten_vat_tu === 'Vải Kaki May Áo Test F01 (Đã Cập Nhật)', 'Tên vật tư chưa cập nhật');
      recordPass('TEST 5: PUT cập nhật vật tư thành công (HTTP 200)');
    } catch (e) {
      recordFail('TEST 5: PUT sửa vật tư', e);
    }

    // -------------------------------------------------------------
    // TEST 6: PUT id không tồn tại -> 404 Not Found
    // -------------------------------------------------------------
    try {
      const res = await sendRequest(
        'PUT',
        '/master-data/vat-tu/9999999',
        {
          ten_vat_tu: 'Non-existent item',
        },
        khoToken
      );
      assert(res.status === 404, `Kỳ vọng 404 Not Found nhưng nhận ${res.status}`);
      assert(res.data.errorCode === 'NOT_FOUND', `Kỳ vọng NOT_FOUND nhưng nhận ${res.data.errorCode}`);
      recordPass('TEST 6: PUT ID không tồn tại bị từ chối với HTTP 404 NOT_FOUND');
    } catch (e) {
      recordFail('TEST 6: PUT id không tồn tại', e);
    }

    // -------------------------------------------------------------
    // TEST 7: PATCH deactivate -> 200 OK
    // -------------------------------------------------------------
    try {
      const res = await sendRequest(
        'PATCH',
        `/master-data/vat-tu/${createdVtId}/trang-thai`,
        {
          trang_thai: 'ngung_su_dung',
        },
        khoToken
      );
      assert(res.status === 200 && res.data.success, `Kỳ vọng 200 OK nhưng nhận ${res.status}`);
      assert(res.data.data.trang_thai === 'ngung_su_dung', 'Trạng thái chưa chuyển sang ngung_su_dung');
      recordPass('TEST 7: PATCH ngưng sử dụng vật tư thành công (HTTP 200)');
    } catch (e) {
      recordFail('TEST 7: PATCH deactivate', e);
    }

    // -------------------------------------------------------------
    // TEST 8: PATCH activate lại -> 200 OK
    // -------------------------------------------------------------
    try {
      const res = await sendRequest(
        'PATCH',
        `/master-data/vat-tu/${createdVtId}/trang-thai`,
        {
          trang_thai: 'dang_su_dung',
        },
        khoToken
      );
      assert(res.status === 200 && res.data.success, `Kỳ vọng 200 OK nhưng nhận ${res.status}`);
      assert(res.data.data.trang_thai === 'dang_su_dung', 'Trạng thái chưa chuyển sang dang_su_dung');
      recordPass('TEST 8: PATCH kích hoạt lại vật tư thành công (HTTP 200)');
    } catch (e) {
      recordFail('TEST 8: PATCH activate lại', e);
    }

    // -------------------------------------------------------------
    // TEST 9: Unauthenticated -> 401 Unauthorized
    // -------------------------------------------------------------
    try {
      const res = await sendRequest('POST', '/master-data/vat-tu', { ma_vat_tu: 'ANON' });
      assert(res.status === 401, `Kỳ vọng 401 Unauthorized nhưng nhận ${res.status}`);
      recordPass('TEST 9: Request không có token bị từ chối với HTTP 401 Unauthorized');
    } catch (e) {
      recordFail('TEST 9: Unauthenticated', e);
    }

    // -------------------------------------------------------------
    // TEST 10: Unauthorized role -> 403 Forbidden
    // -------------------------------------------------------------
    try {
      const res = await sendRequest(
        'POST',
        '/master-data/vat-tu',
        {
          ma_vat_tu: 'VT-SALES',
          ten_vat_tu: 'Sales Cannot Create Material',
          ma_don_vi_tinh: 1,
        },
        salesToken
      );
      assert(res.status === 403, `Kỳ vọng 403 Forbidden nhưng nhận ${res.status}`);
      recordPass('TEST 10: Vai trò không có quyền [ban_hang] bị từ chối với HTTP 403 Forbidden');
    } catch (e) {
      recordFail('TEST 10: Unauthorized role', e);
    }

    // -------------------------------------------------------------
    // TEST 11: Database vat_tu sau write đúng dữ liệu
    // -------------------------------------------------------------
    try {
      const dbCheck = await db.query('SELECT * FROM vat_tu WHERE id = $1', [createdVtId]);
      assert(dbCheck.rows.length === 1, 'Không tìm thấy vật tư trong DB');
      const row = dbCheck.rows[0];
      assert(row.ma_vat_tu === uniqueCode, 'Mã vật tư trong DB không khớp');
      assert(row.ten_vat_tu === 'Vải Kaki May Áo Test F01 (Đã Cập Nhật)', 'Tên vật tư trong DB không khớp');
      assert(row.trang_thai === 'dang_su_dung', 'Trạng thái trong DB không khớp');
      recordPass('TEST 11: Dữ liệu bảng vat_tu trong PostgreSQL chính xác 100%');
    } catch (e) {
      recordFail('TEST 11: Database vat_tu sau write', e);
    }

    // -------------------------------------------------------------
    // TEST 12: ton_kho KHÔNG bị thay đổi (Zero Inventory Side-Effect)
    // -------------------------------------------------------------
    try {
      const tonKhoAfterRes = await db.query('SELECT ma_kho, ma_vat_tu, so_luong_ton FROM ton_kho ORDER BY ma_kho, ma_vat_tu');
      const tonKhoSnapshotAfter = JSON.stringify(tonKhoAfterRes.rows);
      assert(tonKhoSnapshotBefore === tonKhoSnapshotAfter, 'Bảng ton_kho bị biến động ngoài ý muốn');
      recordPass('TEST 12: Bảng ton_kho bảo toàn 100% (Zero Side-Effects trên tồn kho)');
    } catch (e) {
      recordFail('TEST 12: ton_kho KHÔNG bị thay đổi', e);
    }

    // Dọn dẹp bản ghi kiểm thử
    if (createdVtId) {
      await db.query('DELETE FROM vat_tu WHERE id = $1', [createdVtId]);
    }

    console.log('\n================================================================');
    console.log(`KẾT QUẢ KIỂM THỬ: ${passed} PASS / ${failed} FAIL (TỔNG CỘNG 12 TEST CASES)`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error during tests:', err);
    process.exit(1);
  }
}

runTests();
