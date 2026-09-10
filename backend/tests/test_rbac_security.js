const http = require('http');
const app = require('../src/app');
const db = require('../src/config/database');
const { signToken, requirePermission } = require('../src/middlewares/auth');

function sendReq(port, path, method = 'GET', headers = {}, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
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

async function runRbacTests() {
  console.log('================================================================');
  console.log('🛡️  RBAC PHASE 1 — CRITICAL REMEDIATION TEST SUITE (R01 → R27)');
  console.log('    ERP TỔNG CÔNG TY MAY 10 — ZERO TRUST & IDENTITY INTEGRITY');
  console.log('================================================================\n');

  const server = app.listen(5097);
  const port = 5097;
  let passed = 0;
  let failed = 0;

  function assert(cond, name, detail = '') {
    if (cond) {
      passed++;
      console.log(`  ✅ [PASS] ${name}`);
    } else {
      failed++;
      console.error(`  ❌ [FAIL] ${name} - ${detail}`);
    }
  }

  try {
    // R01: Anonymous request không có token -> 401
    const r01 = await sendReq(port, '/api/v1/phieu-nhap', 'POST', {}, { test: 1 });
    assert(r01.status === 401, 'R01: Anonymous request không có token bị chặn với HTTP 401 Unauthorized', `status: ${r01.status}`);

    // R02: Anonymous + x-user-id: 1 -> 401 (Header injection blocked)
    const r02 = await sendReq(port, '/api/v1/phieu-nhap', 'POST', {
      'x-user-id': '1',
    }, { test: 1 });
    assert(r02.status === 401, 'R02: Anonymous gửi x-user-id: 1 bị từ chối 401 (Chặn giả mạo Admin)', `status: ${r02.status}`);

    // R03: Anonymous + x-role: admin -> 401 (Header injection blocked)
    const r03 = await sendReq(port, '/api/v1/phieu-nhap', 'POST', {
      'x-role': 'admin',
    }, { test: 1 });
    assert(r03.status === 401, 'R03: Anonymous gửi x-role: admin bị từ chối 401 (Chặn gán vai trò tùy tiện)', `status: ${r03.status}`);

    // R04: Normal user token (Sales User 2) + x-role: admin -> 403 Forbidden
    const r04 = await sendReq(port, '/api/v1/phieu-nhap', 'POST', {
      'Authorization': `Bearer ${signToken(2)}`,
      'x-role': 'admin',
    }, { loai_nhap: 'tu_mua_hang', ma_kho_nhap: 1, chiTiet: [] });
    assert(r04.status === 403, 'R04: User Bán hàng gửi x-role: admin bị chặn 403 (Vai trò từ token/DB được bảo vệ)', `status: ${r04.status}`);

    // R05: Normal user token (Sales User 2) + x-user-id: 1 -> 403 Forbidden
    const r05 = await sendReq(port, '/api/v1/phieu-nhap', 'POST', {
      'Authorization': `Bearer ${signToken(2)}`,
      'x-user-id': '1',
    }, { loai_nhap: 'tu_mua_hang', ma_kho_nhap: 1, chiTiet: [] });
    assert(r05.status === 403, 'R05: User Bán hàng gửi x-user-id: 1 vẫn bị chặn 403 (Không thể leo thang quyền sang Admin)', `status: ${r05.status}`);

    // R06: User 2 token + x-user-id: 5 -> Identity remains User 2 in /auth/me
    const r06 = await sendReq(port, '/api/v1/auth/me', 'GET', {
      'Authorization': `Bearer ${signToken(2)}`,
      'x-user-id': '5',
    });
    assert(
      r06.status === 200 &&
      parseInt(r06.body?.data?.id, 10) === 2 &&
      r06.body?.data?.vai_tro === 'ban_hang',
      'R06: User 2 gửi kèm x-user-id: 5 vẫn giữ nguyên danh tính User 2 (Mạo danh tài khoản khác bị vô hiệu)',
      `status: ${r06.status}, id: ${r06.body?.data?.id}, vai_tro: ${r06.body?.data?.vai_tro}`
    );

    // R07: Invalid token format -> 401 Unauthorized
    const r07 = await sendReq(port, '/api/v1/phieu-nhap', 'POST', {
      'Authorization': 'Bearer invalid_malformed_token_xyz',
    }, { test: 1 });
    assert(r07.status === 401, 'R07: Token không đúng định dạng (invalid format) bị từ chối 401 Unauthorized', `status: ${r07.status}`);

    // R08: Sensitive GET anonymous -> 401 Unauthorized
    const r08a = await sendReq(port, '/api/v1/master-data/nguoi-dung', 'GET', {});
    const r08b = await sendReq(port, '/api/v1/vi-tri-kho', 'GET', {});
    const r08c = await sendReq(port, '/api/v1/lo-vat-tu', 'GET', {});
    const r08d = await sendReq(port, '/api/v1/phieu-chuyen', 'GET', {});
    const r08e = await sendReq(port, '/api/v1/phieu-kiem-ke', 'GET', {});
    assert(
      r08a.status === 401 && r08b.status === 401 && r08c.status === 401 && r08d.status === 401 && r08e.status === 401,
      'R08: Sensitive GET APIs (nguoi-dung, vi-tri-kho, lo-vat-tu, phieu-chuyen, phieu-kiem-ke) chặn anonymous với 401',
      `statuses: [${r08a.status}, ${r08b.status}, ${r08c.status}, ${r08d.status}, ${r08e.status}]`
    );

    // R09: Sensitive GET unauthorized role -> 403 Forbidden
    const r09 = await sendReq(port, '/api/v1/ton-kho/the-kho', 'GET', {
      'Authorization': `Bearer ${signToken(2)}`, // Sales is not allowed to view thẻ kho
    });
    assert(r09.status === 403, 'R09: Sensitive GET (/the-kho) chặn vai trò không có thẩm quyền (Sales) với 403 Forbidden', `status: ${r09.status}`);

    // R10: Sensitive GET authorized role -> 200 OK
    const r10a = await sendReq(port, '/api/v1/master-data/nguoi-dung', 'GET', {
      'Authorization': `Bearer ${signToken(1)}`, // Admin
    });
    const r10b = await sendReq(port, '/api/v1/vi-tri-kho', 'GET', {
      'Authorization': `Bearer ${signToken(5)}`, // Warehouse
    });
    assert(
      r10a.status === 200 && r10b.status === 200,
      'R10: Sensitive GET cho phép người dùng có thẩm quyền truy cập (Admin: 200, Warehouse: 200)',
      `statuses: [${r10a.status}, ${r10b.status}]`
    );

    // R11: Admin permission check for non-admin -> 403 Forbidden
    let nonAdminForbidden = false;
    const dummyReqSales = { user: { role: 'SALES' } };
    const dummyResSales = {
      status: (code) => {
        if (code === 403) nonAdminForbidden = true;
        return { json: () => {} };
      }
    };
    requirePermission('warehouse.receipt')(dummyReqSales, dummyResSales, () => {});
    assert(nonAdminForbidden === true, 'R11: requirePermission chặn người dùng non-admin khi thiếu đặc quyền (403 Forbidden)');

    // R12: Admin permission check for admin -> 200 / pass
    let adminPass = false;
    const dummyReqAdmin = { user: { role: 'ADMIN' } };
    const dummyResAdmin = { status: () => ({ json: () => {} }) };
    requirePermission('warehouse.receipt', 'sales.approve', 'finance.manage')(dummyReqAdmin, dummyResAdmin, () => {
      adminPass = true;
    });
    assert(adminPass === true, 'R12: requirePermission cho phép ADMIN vượt qua toàn bộ đặc quyền hệ thống');

    // R13: PH4 create goods receipt with Kho token -> 201 Created
    const r13 = await sendReq(port, '/api/v1/phieu-nhap', 'POST', {
      'Authorization': `Bearer ${signToken(5)}`,
    }, {
      loai_nhap: 'tu_mua_hang',
      ma_kho_nhap: 1,
      nguoi_giao_hang: 'Thủ kho May 10',
      chiTiet: [{ ma_vat_tu: 1, so_luong_nhap: 1, don_gia_nhap: 50000 }],
    });
    assert(r13.status === 201, 'R13: Thủ kho (Token Kho / User 5) được phép lập phiếu nhập kho PH4 (201 Created)', `status: ${r13.status}`);

    // R14: PH4 create goods receipt with Admin token -> 201 Created
    const r14 = await sendReq(port, '/api/v1/phieu-nhap', 'POST', {
      'Authorization': `Bearer ${signToken(1)}`,
    }, {
      loai_nhap: 'tu_mua_hang',
      ma_kho_nhap: 1,
      nguoi_giao_hang: 'Admin May 10',
      chiTiet: [{ ma_vat_tu: 1, so_luong_nhap: 1, don_gia_nhap: 50000 }],
    });
    assert(r14.status === 201, 'R14: Admin hệ thống (Token Admin / User 1) được phép lập phiếu nhập kho PH4 (201 Created)', `status: ${r14.status}`);

    // R15: PH4 create goods receipt with Sales token -> 403 Forbidden
    const r15 = await sendReq(port, '/api/v1/phieu-nhap', 'POST', {
      'Authorization': `Bearer ${signToken(2)}`,
    }, {
      loai_nhap: 'tu_mua_hang',
      ma_kho_nhap: 1,
      nguoi_giao_hang: 'Chuyên viên Bán hàng',
      chiTiet: [{ ma_vat_tu: 1, so_luong_nhap: 1, don_gia_nhap: 50000 }],
    });
    assert(r15.status === 403, 'R15: Bán hàng (Token Sales / User 2) KHÔNG ĐƯỢC phép lập phiếu nhập kho PH4 (403 Forbidden)', `status: ${r15.status}`);

    // R16: Unknown role / malformed auth -> 401 / 403
    const r16a = await sendReq(port, '/api/v1/phieu-nhap', 'POST', {
      'Authorization': 'Bearer demo-token-unknown_intruder_role',
    }, { test: 1 });
    const r16b = await sendReq(port, '/api/v1/ton-kho', 'GET', {
      'Authorization': 'Basic dXNlcjpwYXNz',
    });
    assert(
      (r16a.status === 401 || r16a.status === 403) && r16b.status === 401,
      'R16: Unknown role / malformed auth scheme bị từ chối truy cập (401/403)',
      `r16a: ${r16a.status}, r16b: ${r16b.status}`
    );

    // ==========================================
    // CRITICAL REMEDIATION VERIFICATION (R17 → R27)
    // ==========================================

    // R17: Forged Admin token (erp_token_1_999999999999) -> Must be rejected (401/403), NEVER 201
    const r17 = await sendReq(port, '/api/v1/phieu-nhap', 'POST', {
      'Authorization': 'Bearer erp_token_1_999999999999',
    }, {
      loai_nhap: 'tu_mua_hang',
      ma_kho_nhap: 1,
      nguoi_giao_hang: 'Forged Attacker',
      chiTiet: [{ ma_vat_tu: 1, so_luong_nhap: 1, don_gia_nhap: 1000 }],
    });
    assert(
      r17.status === 401 || r17.status === 403,
      'R17: [CRITICAL F01] Forged Admin token (erp_token_1_999999999999) BỊ CHẶN TUYỆT ĐỐI (401/403, không thể thành 201)',
      `status: ${r17.status}`
    );

    // R18: Empty login POST /api/v1/auth/login {} -> 400 Bad Request
    const r18 = await sendReq(port, '/api/v1/auth/login', 'POST', {}, {});
    assert(
      r18.status === 400,
      'R18: [CRITICAL F03] Empty body login {} bị từ chối với HTTP 400 Bad Request',
      `status: ${r18.status}`
    );

    // R19: Login missing email {"password":"123"} -> 400 Bad Request
    const r19 = await sendReq(port, '/api/v1/auth/login', 'POST', {}, { password: '123' });
    assert(
      r19.status === 400,
      'R19: [CRITICAL F03] Login thiếu email bị từ chối với HTTP 400 Bad Request',
      `status: ${r19.status}`
    );

    // R20: Login missing password {"email":"admin@may10.vn"} -> 400 Bad Request
    const r20 = await sendReq(port, '/api/v1/auth/login', 'POST', {}, { email: 'admin@may10.vn' });
    assert(
      r20.status === 400,
      'R20: [CRITICAL F03] Login thiếu password bị từ chối với HTTP 400 Bad Request',
      `status: ${r20.status}`
    );

    // R21: Anonymous /auth/me -> 401 Unauthorized (No fallback to Admin)
    const r21 = await sendReq(port, '/api/v1/auth/me', 'GET', {});
    assert(
      r21.status === 401,
      'R21: [CRITICAL F02] Anonymous truy cập /auth/me bị chặn với HTTP 401 Unauthorized (Không lộ Admin profile)',
      `status: ${r21.status}`
    );

    // R22: Anonymous dashboard summary -> 401 Unauthorized
    const r22 = await sendReq(port, '/api/v1/dashboard/summary', 'GET', {});
    assert(
      r22.status === 401,
      'R22: [MEDIUM F04] Anonymous truy cập /dashboard/summary bị chặn với HTTP 401 Unauthorized',
      `status: ${r22.status}`
    );

    // R23: Anonymous supplier master data -> 401 Unauthorized
    const r23 = await sendReq(port, '/api/v1/master-data/nha-cung-cap', 'GET', {});
    assert(
      r23.status === 401,
      'R23: [MEDIUM F05] Anonymous truy cập /master-data/nha-cung-cap bị chặn với HTTP 401 Unauthorized',
      `status: ${r23.status}`
    );

    // R24: SALES user directory -> 403 Forbidden
    const r24 = await sendReq(port, '/api/v1/master-data/nguoi-dung', 'GET', {
      'Authorization': `Bearer ${signToken(2)}`, // Sales
    });
    assert(
      r24.status === 403,
      'R24: [MEDIUM F06] User Bán hàng truy cập danh bạ nhân sự /master-data/nguoi-dung bị chặn 403 Forbidden',
      `status: ${r24.status}`
    );

    // R25: WAREHOUSE user directory -> 403 Forbidden
    const r25 = await sendReq(port, '/api/v1/master-data/nguoi-dung', 'GET', {
      'Authorization': `Bearer ${signToken(5)}`, // Warehouse
    });
    assert(
      r25.status === 403,
      'R25: [MEDIUM F06] Thủ kho truy cập danh bạ nhân sự /master-data/nguoi-dung bị chặn 403 Forbidden',
      `status: ${r25.status}`
    );

    // R26: ADMIN user directory -> 200 OK
    const r26 = await sendReq(port, '/api/v1/master-data/nguoi-dung', 'GET', {
      'Authorization': `Bearer ${signToken(1)}`, // Admin
    });
    assert(
      r26.status === 200 && Array.isArray(r26.body?.data),
      'R26: [MEDIUM F06] Quản trị viên truy cập danh bạ nhân sự /master-data/nguoi-dung được phép (200 OK)',
      `status: ${r26.status}, count: ${r26.body?.data?.length}`
    );

    // R27: Suspended/non-existent user token or past expired token -> 401 Unauthorized
    const r27 = await sendReq(port, '/api/v1/auth/me', 'GET', {
      'Authorization': `Bearer ${signToken(9999)}`, // Non-existent user ID
    });
    assert(
      r27.status === 401,
      'R27: Token ký cho người dùng không tồn tại trong database bị từ chối 401 Unauthorized',
      `status: ${r27.status}`
    );

    console.log('================================================================');
    console.log(`📊 TỔNG KẾT KIỂM THỬ: ${passed}/${passed + failed} TEST CASES ĐẠT CHUẨN (${Math.round((passed / (passed + failed)) * 100)}%)`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Lỗi khi chạy RBAC test suite:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await db.pool.end();
  }
}

runRbacTests();
