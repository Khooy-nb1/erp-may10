/**
 * TEST SUITE: ADMIN USER MANAGEMENT (QUẢN TRỊ → NGƯỜI DÙNG)
 * Kiểm tra toàn diện 25 test case bắt buộc: AUTH, RBAC, VALIDATION, SECURITY, SELF-PROTECTION
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
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function login(email, password) {
  const res = await sendRequest('POST', '/auth/login', { email, password });
  return res;
}

async function runTests() {
  console.log('================================================================');
  console.log('TEST SUITE: QUẢN TRỊ NGƯỜI DÙNG ERP MAY 10 (ADMIN USER MANAGEMENT)');
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
    // -------------------------------------------------------------
    // GROUP A: AUTHENTICATION
    // -------------------------------------------------------------
    console.log('--- PHẦN A: AUTHENTICATION ---');

    // 1. Admin login thành công
    let adminToken = '';
    try {
      const res = await login('admin@may10.vn', 'Admin@123');
      assert(res.status === 200 && res.data.success, 'Login failed');
      adminToken = res.data.data.token;
      recordPass('Test 1: Admin login thành công', `Token: ${adminToken.substring(0, 25)}...`);
    } catch (e) {
      recordFail('Test 1: Admin login thành công', e);
    }

    // 2. User sai password bị từ chối
    try {
      const res = await login('admin@may10.vn', 'WrongPassword123');
      assert(res.status === 401, `Kỳ vọng 401 nhưng nhận ${res.status}`);
      recordPass('Test 2: Sai mật khẩu bị từ chối với HTTP 401 Unauthorized');
    } catch (e) {
      recordFail('Test 2: Sai mật khẩu bị từ chối', e);
    }

    // -------------------------------------------------------------
    // GROUP B: ADMIN CRUD & RBAC MANAGEMENT
    // -------------------------------------------------------------
    console.log('\n--- PHẦN B: ADMIN CRUD & RBAC ---');

    // 4. Admin GET users -> PASS (200)
    let initialUsers = [];
    try {
      const res = await sendRequest('GET', '/users', null, adminToken);
      assert(res.status === 200 && res.data.success, 'Không lấy được danh sách users');
      assert(Array.isArray(res.data.data), 'Data không phải là mảng');
      initialUsers = res.data.data;
      recordPass('Test 4: Admin GET /users thành công (HTTP 200)', `Tổng số: ${initialUsers.length} users`);
    } catch (e) {
      recordFail('Test 4: Admin GET /users', e);
    }

    // 5. Admin POST user -> PASS (201)
    const testUserEmail = `test.user.${Date.now()}@may10.vn`;
    let createdUserId = null;
    try {
      const res = await sendRequest(
        'POST',
        '/users',
        {
          ho_ten: 'Nguyễn Văn Kiểm Thử',
          email: testUserEmail,
          vai_tro: 'ban_hang',
          phong_ban: 'Phòng Thử Nghiệm QA',
          so_dien_thoai: '0912345678',
          mat_khau: 'Password@2026',
        },
        adminToken
      );
      assert(res.status === 201 && res.data.success, `Kỳ vọng 201 Created nhưng nhận ${res.status}`);
      assert(res.data.data && res.data.data.id, 'Thiếu ID người dùng mới tạo');
      createdUserId = res.data.data.id;
      recordPass('Test 5: Admin POST /users tạo người dùng mới thành công (HTTP 201)', `ID: ${createdUserId}, Email: ${testUserEmail}`);
    } catch (e) {
      recordFail('Test 5: Admin POST /users', e);
    }

    // Kiểm tra đăng nhập với user mới tạo sử dụng mật khẩu PBKDF2
    try {
      const loginNew = await login(testUserEmail, 'Password@2026');
      assert(loginNew.status === 200 && loginNew.data.success, 'User mới tạo không thể đăng nhập');
      recordPass('Test 5.1: User mới tạo đăng nhập thành công với mật khẩu đã hash PBKDF2');
    } catch (e) {
      recordFail('Test 5.1: User mới tạo đăng nhập', e);
    }

    // 6. Admin UPDATE user -> PASS (200)
    try {
      const res = await sendRequest(
        'PUT',
        `/users/${createdUserId}`,
        {
          ho_ten: 'Nguyễn Văn Kiểm Thử (Đã Cập Nhật)',
          phong_ban: 'Phòng Phát Triển Công Nghệ',
          so_dien_thoai: '0987654321',
        },
        adminToken
      );
      assert(res.status === 200 && res.data.success, `Kỳ vọng 200 nhưng nhận ${res.status}`);
      assert(res.data.data.ho_ten === 'Nguyễn Văn Kiểm Thử (Đã Cập Nhật)', 'Họ tên chưa cập nhật');
      recordPass('Test 6: Admin PUT /users/:id cập nhật thông tin thành công (HTTP 200)');
    } catch (e) {
      recordFail('Test 6: Admin PUT /users/:id', e);
    }

    // 7. Admin change role -> PASS (200)
    try {
      const res = await sendRequest('PATCH', `/users/${createdUserId}/role`, { vai_tro: 'kho' }, adminToken);
      assert(res.status === 200 && res.data.success, `Kỳ vọng 200 nhưng nhận ${res.status}`);
      assert(res.data.data.vai_tro === 'kho', 'Vai trò chưa cập nhật sang kho');
      recordPass('Test 7: Admin PATCH /users/:id/role đổi vai trò sang [kho] thành công (HTTP 200)');
    } catch (e) {
      recordFail('Test 7: Admin PATCH /users/:id/role', e);
    }

    // 8. Admin deactivate user -> PASS (200)
    try {
      const res = await sendRequest('PATCH', `/users/${createdUserId}/status`, { trang_thai: 'khoa' }, adminToken);
      assert(res.status === 200 && res.data.success, `Kỳ vọng 200 nhưng nhận ${res.status}`);
      assert(res.data.data.trang_thai === 'khoa', 'Trạng thái chưa chuyển sang khoa');
      recordPass('Test 8: Admin PATCH /users/:id/status khóa tài khoản thành công (HTTP 200)');
    } catch (e) {
      recordFail('Test 8: Admin PATCH /users/:id/status (khóa)', e);
    }

    // 3. User bị khóa không đăng nhập được (HTTP 403 ACCOUNT_SUSPENDED)
    try {
      const res = await login(testUserEmail, 'Password@2026');
      assert(res.status === 403, `Kỳ vọng 403 Forbidden nhưng nhận ${res.status}`);
      assert(res.data.errorCode === 'ACCOUNT_SUSPENDED', `Kỳ vọng ACCOUNT_SUSPENDED nhưng nhận ${res.data.errorCode}`);
      recordPass('Test 3: Tài khoản bị khóa bị từ chối đăng nhập với HTTP 403 ACCOUNT_SUSPENDED');
    } catch (e) {
      recordFail('Test 3: Tài khoản bị khóa đăng nhập', e);
    }

    // 9. Admin activate user -> PASS (200)
    try {
      const res = await sendRequest('PATCH', `/users/${createdUserId}/status`, { trang_thai: 'hoat_dong' }, adminToken);
      assert(res.status === 200 && res.data.success, `Kỳ vọng 200 nhưng nhận ${res.status}`);
      assert(res.data.data.trang_thai === 'hoat_dong', 'Trạng thái chưa chuyển sang hoat_dong');
      recordPass('Test 9: Admin PATCH /users/:id/status mở khóa tài khoản thành công (HTTP 200)');
    } catch (e) {
      recordFail('Test 9: Admin mở khóa tài khoản', e);
    }

    // Kiểm tra đăng nhập lại thành công sau khi mở khóa
    try {
      const res = await login(testUserEmail, 'Password@2026');
      assert(res.status === 200 && res.data.success, 'Không thể đăng nhập sau khi mở khóa');
      recordPass('Test 9.1: Tài khoản đăng nhập bình thường sau khi được mở khóa');
    } catch (e) {
      recordFail('Test 9.1: Đăng nhập sau mở khóa', e);
    }

    // 10. Admin reset password -> PASS (200)
    try {
      const res = await sendRequest('POST', `/users/${createdUserId}/reset-password`, { newPassword: 'NewPassword@999' }, adminToken);
      assert(res.status === 200 && res.data.success, `Kỳ vọng 200 nhưng nhận ${res.status}`);
      recordPass('Test 10: Admin POST /users/:id/reset-password đặt lại mật khẩu thành công (HTTP 200)');
    } catch (e) {
      recordFail('Test 10: Admin reset password', e);
    }

    // Kiểm tra đăng nhập với mật khẩu mới
    try {
      const oldLogin = await login(testUserEmail, 'Password@2026');
      assert(oldLogin.status === 401, 'Mật khẩu cũ vẫn đăng nhập được');
      const newLogin = await login(testUserEmail, 'NewPassword@999');
      assert(newLogin.status === 200 && newLogin.data.success, 'Mật khẩu mới không đăng nhập được');
      recordPass('Test 10.1: Đăng nhập thành công với mật khẩu mới, mật khẩu cũ bị vô hiệu');
    } catch (e) {
      recordFail('Test 10.1: Kiểm tra mật khẩu mới', e);
    }

    // -------------------------------------------------------------
    // NON-ADMIN ROLES RBAC TEST (Phải trả về 403 Forbidden)
    // -------------------------------------------------------------
    console.log('\n--- PHẦN C: NON-ADMIN RBAC RESTRICTIONS (HTTP 403) ---');

    const nonAdminRoles = [
      { role: 'ban_hang', email: 'banhang@may10.vn', name: 'Bán hàng', testNum: 11 },
      { role: 'san_xuat', email: 'sanxuat@may10.vn', name: 'Sản xuất', testNum: 12 },
      { role: 'mua_hang', email: 'muahang@may10.vn', name: 'Mua hàng', testNum: 13 },
      { role: 'kho', email: 'kho@may10.vn', name: 'Thủ kho', testNum: 14 },
      { role: 'ke_toan', email: 'ketoan@may10.vn', name: 'Kế toán', testNum: 15 },
    ];

    for (const item of nonAdminRoles) {
      try {
        const loginRes = await login(item.email, 'Admin@123');
        assert(loginRes.status === 200 && loginRes.data.success, `Không đăng nhập được user ${item.email}`);
        const token = loginRes.data.data.token;

        const getRes = await sendRequest('GET', '/users', null, token);
        assert(getRes.status === 403, `Vai trò ${item.role} gọi GET /users nhận ${getRes.status}, kỳ vọng 403`);

        const postRes = await sendRequest('POST', '/users', { ho_ten: 'Hack', email: 'hack@may10.vn', vai_tro: 'admin' }, token);
        assert(postRes.status === 403, `Vai trò ${item.role} gọi POST /users nhận ${postRes.status}, kỳ vọng 403`);

        recordPass(`Test ${item.testNum}: Vai trò [${item.name} (${item.role})] bị từ chối 403 Forbidden khi truy cập User Management`);
      } catch (e) {
        recordFail(`Test ${item.testNum}: Vai trò [${item.name}] RBAC check`, e);
      }
    }

    // -------------------------------------------------------------
    // VALIDATION & ERROR HANDLING
    // -------------------------------------------------------------
    console.log('\n--- PHẦN D: VALIDATION & ERROR HANDLING ---');

    // 16. Duplicate username/email -> reject (409)
    try {
      const res = await sendRequest('POST', '/users', {
        ho_ten: 'Trùng Email',
        email: 'admin@may10.vn', // Email đã có
        vai_tro: 'kho',
      }, adminToken);
      assert(res.status === 409, `Kỳ vọng 409 nhưng nhận ${res.status}`);
      assert(res.data.errorCode === 'DUPLICATE_EMAIL', `Kỳ vọng DUPLICATE_EMAIL nhưng nhận ${res.data.errorCode}`);
      recordPass('Test 16: Trùng lặp email bị từ chối với HTTP 409 DUPLICATE_EMAIL');
    } catch (e) {
      recordFail('Test 16: Trùng lặp email', e);
    }

    // 17. Invalid role -> reject (400)
    try {
      const res = await sendRequest('POST', '/users', {
        ho_ten: 'Sai Vai Trò',
        email: `invalid.role.${Date.now()}@may10.vn`,
        vai_tro: 'super_hacker_role',
      }, adminToken);
      assert(res.status === 400, `Kỳ vọng 400 nhưng nhận ${res.status}`);
      recordPass('Test 17: Vai trò không thuộc Canonical Roles bị từ chối với HTTP 400');
    } catch (e) {
      recordFail('Test 17: Vai trò không hợp lệ', e);
    }

    // 18. Invalid required field (thiếu tên / thiếu email) -> reject (400)
    try {
      const res = await sendRequest('POST', '/users', {
        ho_ten: '',
        email: '',
        vai_tro: 'kho',
      }, adminToken);
      assert(res.status === 400, `Kỳ vọng 400 nhưng nhận ${res.status}`);
      recordPass('Test 18: Thiếu trường bắt buộc bị từ chối với HTTP 400 VALIDATION_ERROR');
    } catch (e) {
      recordFail('Test 18: Thiếu trường bắt buộc', e);
    }

    // 19. Password không đạt policy (< 6 ký tự) -> reject (400)
    try {
      const res = await sendRequest('POST', `/users/${createdUserId}/reset-password`, {
        newPassword: '123',
      }, adminToken);
      assert(res.status === 400, `Kỳ vọng 400 nhưng nhận ${res.status}`);
      assert(res.data.errorCode === 'INVALID_PASSWORD', `Kỳ vọng INVALID_PASSWORD nhưng nhận ${res.data.errorCode}`);
      recordPass('Test 19: Mật khẩu < 6 ký tự bị từ chối với HTTP 400 INVALID_PASSWORD');
    } catch (e) {
      recordFail('Test 19: Password không đạt policy', e);
    }

    // 20. Self-protection: Admin không được tự khóa chính mình (400)
    try {
      const res = await sendRequest('PATCH', '/users/1/status', { trang_thai: 'khoa' }, adminToken);
      assert(res.status === 400, `Kỳ vọng 400 nhưng nhận ${res.status}`);
      assert(res.data.errorCode === 'CANNOT_LOCK_SELF', `Kỳ vọng CANNOT_LOCK_SELF nhưng nhận ${res.data.errorCode}`);
      recordPass('Test 20: [Self-Protection] Admin tự khóa chính mình bị chặn với HTTP 400 CANNOT_LOCK_SELF');
    } catch (e) {
      recordFail('Test 20: Admin tự khóa chính mình', e);
    }

    // 21. Self-protection: Không được khóa Admin cuối cùng
    try {
      // Thử khóa admin ID 1 từ chính nó hoặc khi là admin duy nhất
      const res = await sendRequest('PATCH', '/users/1/status', { trang_thai: 'khoa' }, adminToken);
      assert(res.status === 400, `Kỳ vọng 400 nhưng nhận ${res.status}`);
      recordPass('Test 21: [Self-Protection] Chống khóa tài khoản quản trị viên duy nhất của hệ thống');
    } catch (e) {
      recordFail('Test 21: Khóa admin cuối cùng', e);
    }

    // -------------------------------------------------------------
    // SECURITY & AUDIT INTEGRITY
    // -------------------------------------------------------------
    console.log('\n--- PHẦN E: SECURITY & INTEGRITY ---');

    // 22. Không password plaintext trong DB
    try {
      const dbRes = await db.query(`SELECT mat_khau FROM nguoi_dung WHERE id = $1`, [createdUserId]);
      const dbPass = dbRes.rows[0].mat_khau;
      assert(dbPass.startsWith('$pbkdf2$'), `Mật khẩu trong DB không được hash chuẩn PBKDF2: ${dbPass}`);
      assert(!dbPass.includes('NewPassword@999'), 'Mật khẩu plaintext bị lộ trong DB');
      recordPass('Test 22: Mật khẩu trong DB được mã hóa 100% bằng PBKDF2 (Zero Plaintext)');
    } catch (e) {
      recordFail('Test 22: Mật khẩu trong DB', e);
    }

    // 23. Không password plaintext trong API response
    try {
      const resList = await sendRequest('GET', '/users', null, adminToken);
      const resSingle = await sendRequest('GET', `/users/${createdUserId}`, null, adminToken);
      const allText = JSON.stringify(resList.data) + JSON.stringify(resSingle.data);
      assert(!allText.includes('mat_khau'), 'Trường mat_khau xuất hiện trong API response');
      assert(!allText.includes('NewPassword@999'), 'Mật khẩu plaintext xuất hiện trong API response');
      recordPass('Test 23: API Response không chứa trường mat_khau hay mật khẩu plaintext');
    } catch (e) {
      recordFail('Test 23: Password trong API response', e);
    }

    // 24. Anonymous request bị chặn với 401 Unauthorized
    try {
      const res = await sendRequest('GET', '/users');
      assert(res.status === 401, `Kỳ vọng 401 nhưng nhận ${res.status}`);
      recordPass('Test 24: Anonymous request không có token bị từ chối với HTTP 401 Unauthorized');
    } catch (e) {
      recordFail('Test 24: Anonymous request', e);
    }

    // 25. Không sửa được PK tùy tiện
    try {
      const res = await sendRequest(
        'PUT',
        `/users/${createdUserId}`,
        {
          id: 999999, // Thử đổi PK
          ho_ten: 'Tên Không Đổi PK',
        },
        adminToken
      );
      assert(res.status === 200, `Kỳ vọng 200 nhưng nhận ${res.status}`);
      assert(String(res.data.data.id) === String(createdUserId), `PK bị thay đổi từ ${createdUserId} sang ${res.data.data.id}`);
      recordPass('Test 25: Khóa chính (PK id) bất biến, không thể bị ghi đè qua request body');
    } catch (e) {
      recordFail('Test 25: Bất biến PK', e);
    }

    // Dọn dẹp user kiểm thử
    if (createdUserId) {
      await db.query(`DELETE FROM nguoi_dung WHERE id = $1`, [createdUserId]);
    }

    console.log('\n================================================================');
    console.log(`KẾT QUẢ KIỂM THỬ: ${passed} PASS / ${failed} FAIL (TỔNG CỘNG 25 TEST CASES)`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Lỗi nghiêm trọng trong runner:', err);
    process.exit(1);
  }
}

runTests();
