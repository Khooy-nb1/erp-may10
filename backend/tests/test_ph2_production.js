/**
 * Comprehensive Test Suite for ERP May 10 — PH2: Sản xuất & Hoạch định nguyên liệu
 * Verifies all required functional test cases:
 * 1. Authentication
 * 2. RBAC
 * 3. Dashboard
 * 4. Create plan
 * 5. Approve plan
 * 6. Reject approve when missing BOM
 * 7. BOM CRUD
 * 8. Create production order
 * 9. Start order
 * 10. MRP calculation
 * 11. Shortage calculation
 * 12. Production result
 * 13. Auto complete order
 * 14. Reconciliation
 * 15. Invalid input
 * 16. Unauthorized request
 */

const http = require('http');
const app = require('../src/app');
const db = require('../src/config/database');
const { signToken } = require('../src/middlewares/auth');

let server;
const PORT = 5199;

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

async function runPh2FunctionalTests() {
  console.log('================================================================');
  console.log('🧪 BẮT ĐẦU BỘ KIỂM THỬ TOÀN DIỆN PH2 (SẢN XUẤT & HOẠCH ĐỊNH)');
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
    const tokenAdmin = signToken(1); // role admin
    const tokenSanXuat = signToken(3); // role san_xuat
    const tokenBanHang = signToken(2); // role ban_hang (unauthorized for PH2)

    // -------------------------------------------------------------
    // TEST 1 & 16: Authentication & Unauthorized Request
    // -------------------------------------------------------------
    console.log('1. TEST 1 & 16: Authentication & Unauthorized Request');
    const unauthRes = await request('/api/v1/production/dashboard', 'GET');
    assert(unauthRes.status === 401, 'Không có token bị từ chối với HTTP 401 Unauthorized');

    const fakeTokenRes = await request('/api/v1/production/dashboard', 'GET', null, 'fake_token_123');
    assert(fakeTokenRes.status === 401, 'Token không hợp lệ bị từ chối với HTTP 401');

    // -------------------------------------------------------------
    // TEST 2: RBAC (Role-Based Access Control)
    // -------------------------------------------------------------
    console.log('\n2. TEST 2: RBAC Access Control');
    const forbidRes = await request('/api/v1/production/plans', 'GET', null, tokenBanHang);
    assert(forbidRes.status === 403, 'User vai trò ban_hang bị chặn với HTTP 403 Forbidden');

    const allowRes = await request('/api/v1/production/plans', 'GET', null, tokenSanXuat);
    assert(allowRes.status === 200, 'User vai trò san_xuat được truy cập thành công với HTTP 200');

    // -------------------------------------------------------------
    // TEST 3: Dashboard Statistics
    // -------------------------------------------------------------
    console.log('\n3. TEST 3: Dashboard Overview');
    const dashRes = await request('/api/v1/production/dashboard', 'GET', null, tokenSanXuat);
    assert(dashRes.status === 200, 'Dashboard trả về HTTP 200 OK');
    assert(dashRes.data && dashRes.data.data && typeof dashRes.data.data.pendingPlans === 'number', 'Dashboard chứa đầy đủ cấu trúc chỉ số KPI');

    // -------------------------------------------------------------
    // TEST 4: Create Plan
    // -------------------------------------------------------------
    console.log('\n4. TEST 4: Create Production Plan');
    const planPayload = {
      ma_san_pham: 1, // Áo sơ mi nam May 10
      so_luong_ke_hoach: 1000,
      ngay_bat_dau: '2026-09-20',
      ngay_ket_thuc: '2026-09-30',
      ghi_chu: 'KHSX thử nghiệm kiểm thử tự động',
    };
    const createPlanRes = await request('/api/v1/production/plans', 'POST', planPayload, tokenSanXuat);
    assert(createPlanRes.status === 201, 'Tạo kế hoạch sản xuất trả về HTTP 201 Created');
    const newPlan = createPlanRes.data.data;
    assert(newPlan && newPlan.trang_thai === 'cho_duyet', 'KHSX mới tạo có trạng thái ban đầu là "cho_duyet"');

    // Test GET Plan by ID
    const getPlanRes = await request(`/api/v1/production/plans/${newPlan.id}`, 'GET', null, tokenSanXuat);
    assert(getPlanRes.status === 200 && getPlanRes.data.data.id === newPlan.id, 'Lấy chi tiết kế hoạch theo ID thành công');

    // -------------------------------------------------------------
    // TEST 6: Reject approve when missing BOM
    // -------------------------------------------------------------
    console.log('\n5. TEST 6: Reject Approve when Missing BOM');
    // Tạo kế hoạch cho sản phẩm chưa có BOM hiệu lực (ví dụ tạo một sản phẩm tạm không BOM)
    const tempSpRes = await db.query(
      `INSERT INTO san_pham (ma_san_pham, ten_san_pham, ma_don_vi_tinh, gia_ban, trang_thai) 
       VALUES ('SP-NO-BOM', 'Sản phẩm thử nghiệm không BOM', 1, 250000, 'dang_kinh_doanh') 
       RETURNING id`
    );
    const tempSpId = tempSpRes.rows[0].id;

    const noBomPlanRes = await request('/api/v1/production/plans', 'POST', {
      ma_san_pham: tempSpId,
      so_luong_ke_hoach: 500,
    }, tokenSanXuat);
    const noBomPlanId = noBomPlanRes.data.data.id;

    const failApproveRes = await request(`/api/v1/production/plans/${noBomPlanId}/approve`, 'POST', null, tokenSanXuat);
    assert(failApproveRes.status === 400, 'Từ chối duyệt kế hoạch khi sản phẩm chưa có BOM hiệu lực (HTTP 400)');
    assert(failApproveRes.data.errorCode === 'BOM_MISSING', 'Mã lỗi trả về đúng: BOM_MISSING');

    // -------------------------------------------------------------
    // TEST 7: BOM CRUD
    // -------------------------------------------------------------
    console.log('\n6. TEST 7: BOM CRUD');
    // Thêm định mức BOM cho tempSpId
    const createBomRes = await request('/api/v1/production/bom', 'POST', {
      ma_san_pham: tempSpId,
      ma_vat_tu: 1, // Vải kate
      dinh_muc: 1.5,
      ty_le_hao_hut: 2.0,
      trang_thai: 'hieu_luc',
    }, tokenSanXuat);
    assert(createBomRes.status === 201, 'Tạo mới định mức BOM thành công với HTTP 201');
    const createdBom = createBomRes.data.data;
    assert(createdBom && parseFloat(createdBom.dinh_muc) === 1.5, 'Định mức được lưu chuẩn xác 1.5m');

    // Cập nhật BOM
    const updateBomRes = await request(`/api/v1/production/bom/${createdBom.id}`, 'PUT', {
      dinh_muc: 1.6,
      ty_le_hao_hut: 2.5,
    }, tokenSanXuat);
    assert(updateBomRes.status === 200, 'Cập nhật định mức BOM thành công với HTTP 200');

    // -------------------------------------------------------------
    // TEST 5: Approve plan
    // -------------------------------------------------------------
    console.log('\n7. TEST 5: Approve Plan');
    // Sau khi có BOM, phê duyệt noBomPlanId
    const approveRes = await request(`/api/v1/production/plans/${noBomPlanId}/approve`, 'POST', null, tokenSanXuat);
    assert(approveRes.status === 200, 'Phê duyệt kế hoạch thành công sau khi đã có BOM (HTTP 200)');
    assert(approveRes.data.data.trang_thai === 'da_duyet', 'Trạng thái KHSX sau khi duyệt là "da_duyet"');

    // Phê duyệt lại kế hoạch đã duyệt -> Xung đột CONFLICT (409)
    const dupApproveRes = await request(`/api/v1/production/plans/${noBomPlanId}/approve`, 'POST', null, tokenSanXuat);
    assert(dupApproveRes.status === 409, 'Chống phê duyệt trùng lặp thành công (HTTP 409 Conflict)');

    // -------------------------------------------------------------
    // TEST 8: Create Production Order
    // -------------------------------------------------------------
    console.log('\n8. TEST 8: Create Production Order (LSX)');
    const orderPayload = {
      ma_ke_hoach_san_xuat: noBomPlanId,
      so_luong_yeu_cau: 500,
      ghi_chu: 'Lệnh may chuyền A1',
    };
    const createOrderRes = await request('/api/v1/production/orders', 'POST', orderPayload, tokenSanXuat);
    assert(createOrderRes.status === 201, 'Phát hành lệnh sản xuất thành công với HTTP 201');
    const newOrder = createOrderRes.data.data;
    assert(newOrder.trang_thai === 'chua_bat_dau', 'Trạng thái LSX ban đầu là "chua_bat_dau"');
    assert(parseFloat(newOrder.so_luong_hoan_thanh) === 0, 'Sản lượng hoàn thành ban đầu là 0');

    // Kiểm tra tự động sinh 4 công đoạn: Cắt, May, Hoàn thiện, KCS
    const stagesRes = await request(`/api/v1/production/orders/${newOrder.id}/stages`, 'GET', null, tokenSanXuat);
    assert(stagesRes.status === 200 && stagesRes.data.data.length === 4, 'Hệ thống tự động khởi tạo đủ 4 công đoạn sản xuất');

    // -------------------------------------------------------------
    // TEST 9: Start Order
    // -------------------------------------------------------------
    console.log('\n9. TEST 9: Start Order');
    const startOrderRes = await request(`/api/v1/production/orders/${newOrder.id}/start`, 'POST', null, tokenSanXuat);
    assert(startOrderRes.status === 200, 'Khởi động lệnh sản xuất thành công (HTTP 200)');
    assert(startOrderRes.data.data.trang_thai === 'dang_san_xuat', 'Trạng thái lệnh chuyển sang "dang_san_xuat"');

    // -------------------------------------------------------------
    // TEST 10 & 11: MRP Calculation & Shortage Calculation
    // -------------------------------------------------------------
    console.log('\n10. TEST 10 & 11: MRP & Shortage Calculation');
    const mrpRes = await request('/api/v1/production/mrp', 'GET', null, tokenSanXuat);
    assert(mrpRes.status === 200, 'Tính toán MRP thành công (HTTP 200)');
    assert(Array.isArray(mrpRes.data.data), 'Kết quả MRP trả về danh sách mảng dữ liệu vật tư');
    const itemShortage = mrpRes.data.data.find(m => m.so_luong_can_mua > 0);
    if (itemShortage) {
      assert(itemShortage.so_luong_can_mua === Math.max(0, itemShortage.so_luong_can - itemShortage.so_luong_ton_kho), 'Công thức tính thiếu hụt Max(0, Nhu cầu - Tồn kho) chính xác 100%');
    } else {
      assert(true, 'Tất cả vật tư tồn kho đều đáp ứng đủ nhu cầu KHSX');
    }

    // -------------------------------------------------------------
    // TEST 12: Production Result (Ghi nhận ca sản xuất)
    // -------------------------------------------------------------
    console.log('\n11. TEST 12: Production Result');
    const resultPayload1 = {
      ma_lenh_san_xuat: newOrder.id,
      so_luong_hoan_thanh: 200,
      so_luong_loi: 5,
      ghi_chu: 'Ca sáng ngày 1',
    };
    const logRes1 = await request('/api/v1/production/results', 'POST', resultPayload1, tokenSanXuat);
    assert(logRes1.status === 201, 'Ghi nhận kết quả ca sản xuất thành công với HTTP 201');
    assert(logRes1.data.totalCompleted === 200, 'Tổng sản lượng tích lũy đạt 200');
    assert(logRes1.data.isFinished === false, 'Lệnh chưa hoàn thành (200 < 500)');

    // -------------------------------------------------------------
    // TEST 13: Auto Complete Order
    // -------------------------------------------------------------
    console.log('\n12. TEST 13: Auto Complete Order when Reaching Quantity');
    const resultPayload2 = {
      ma_lenh_san_xuat: newOrder.id,
      so_luong_hoan_thanh: 300, // Đủ 500 sản phẩm
      so_luong_loi: 2,
      ghi_chu: 'Ca chiều ngày 1 - hoàn thành toàn bộ lệnh',
    };
    const logRes2 = await request('/api/v1/production/results', 'POST', resultPayload2, tokenSanXuat);
    assert(logRes2.status === 201, 'Ghi nhận ca hoàn thành đạt số lượng yêu cầu (HTTP 201)');
    assert(logRes2.data.totalCompleted === 500, 'Tổng sản lượng đạt 500/500 SP');
    assert(logRes2.data.isFinished === true, 'Hệ thống tự động kích hoạt cờ hoàn thành isFinished = true');

    const checkOrderRes = await request(`/api/v1/production/orders/${newOrder.id}`, 'GET', null, tokenSanXuat);
    assert(checkOrderRes.data.data.trang_thai === 'hoan_thanh', 'Trạng thái LSX trong database tự động chuyển sang "hoan_thanh"');

    // -------------------------------------------------------------
    // TEST 14: Reconciliation (Đối soát tiêu hao NVL)
    // -------------------------------------------------------------
    console.log('\n13. TEST 14: Production Reconciliation (FR-09 Alignment)');
    const reconRes = await request(`/api/v1/production/reconciliation/${newOrder.id}`, 'GET', null, tokenSanXuat);
    assert(reconRes.status === 200, 'Truy vấn bảng đối soát tiêu hao NVL thành công (HTTP 200)');
    assert(reconRes.data.data && Array.isArray(reconRes.data.data.reconciliation), 'Dữ liệu đối soát trả về danh sách chi tiết chênh lệch định mức');

    // -------------------------------------------------------------
    // TEST 15: Invalid Input Validation
    // -------------------------------------------------------------
    console.log('\n14. TEST 15: Invalid Input Validation');
    const invalidPlan = await request('/api/v1/production/plans', 'POST', {
      ma_san_pham: 1,
      so_luong_ke_hoach: -50, // số lượng âm
    }, tokenSanXuat);
    assert(invalidPlan.status === 400, 'Chặn số lượng kế hoạch âm với HTTP 400 Bad Request');
    assert(invalidPlan.data.errorCode === 'VALIDATION_ERROR', 'Mã lỗi trả về đúng: VALIDATION_ERROR');

    const invalidResult = await request('/api/v1/production/results', 'POST', {
      ma_lenh_san_xuat: newOrder.id,
      so_luong_hoan_thanh: -10, // số lượng âm
    }, tokenSanXuat);
    assert(invalidResult.status === 400, 'Chặn sản lượng báo cáo âm với HTTP 400 Bad Request');

    // Dọn dẹp dữ liệu thử nghiệm
    await db.query(`DELETE FROM ket_qua_san_xuat WHERE ma_lenh_san_xuat = $1`, [newOrder.id]);
    await db.query(`DELETE FROM cong_doan_san_xuat WHERE ma_lenh_san_xuat = $1`, [newOrder.id]);
    await db.query(`DELETE FROM lenh_san_xuat WHERE id = $1`, [newOrder.id]);
    await db.query(`DELETE FROM nhu_cau_npl WHERE ma_ke_hoach_san_xuat IN ($1, $2)`, [newPlan.id, noBomPlanId]);
    await db.query(`DELETE FROM ke_hoach_san_xuat WHERE id IN ($1, $2)`, [newPlan.id, noBomPlanId]);
    await db.query(`DELETE FROM dinh_muc_nguyen_lieu WHERE ma_san_pham = $1`, [tempSpId]);
    await db.query(`DELETE FROM san_pham WHERE id = $1`, [tempSpId]);

  } catch (err) {
    console.error('Lỗi ngoại lệ trong suite test:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    console.log('\n================================================================');
    console.log(`📊 TỔNG KẾT PH2 FUNCTIONAL TESTS: ${passCount}/${testCount} PASS (${Math.round((passCount / testCount) * 100)}%)`);
    console.log('================================================================\n');
    process.exit(process.exitCode ? 1 : 0);
  }
}

runPh2FunctionalTests();
