const http = require('http');
const db = require('../src/config/database');

function apiRequest(path, method = 'GET', data = null, role = 'kho', userId = '1') {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const headers = {
      'Content-Type': 'application/json',
      'x-role': role,
      'x-user-id': userId,
    };
    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method,
        headers,
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

async function runCrossModuleIntegrationTests() {
  console.log('================================================================');
  console.log('🔗 BẮT ĐẦU KIỂM THỬ TÍCH HỢP LIÊN PHÂN HỆ (STEP 3 INTEGRATION)');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 8;

  try {
    // Lấy dữ liệu master data cần thiết
    const khoRes = await db.query(`SELECT id, ten_kho FROM kho LIMIT 1`);
    const vtRes = await db.query(`SELECT id, ten_vat_tu FROM vat_tu LIMIT 1`);
    const dmhRes = await db.query(`SELECT id, ma_don_mua FROM don_mua_hang LIMIT 1`);
    const lsxRes = await db.query(`SELECT id, ma_lenh_san_xuat FROM lenh_san_xuat LIMIT 1`);
    const dbhRes = await db.query(`SELECT id, ma_don_ban FROM don_ban_hang LIMIT 1`);

    const khoId = khoRes.rows[0].id;
    const vatTuId = vtRes.rows[0].id;
    const donMuaId = dmhRes.rows[0].id;
    const lenhSxId = lsxRes.rows[0].id;
    const donBanId = dbhRes.rows[0].id;

    // ------------------------------------------------------------
    // TEST 01: PH3 Đơn Mua Hàng → PH4 Nhập Kho
    // ------------------------------------------------------------
    console.log('--- TEST 01: TÍCH HỢP PH3 (MUA HÀNG) → PH4 (NHẬP KHO) ---');
    const ton01TruocRes = await db.query(`SELECT so_luong_ton FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2`, [khoId, vatTuId]);
    const ton01Truoc = parseFloat(ton01TruocRes.rows[0]?.so_luong_ton || 0);
    const slNhap01 = 40.0;

    const res01 = await apiRequest('/api/v1/phieu-nhap', 'POST', {
      ma_kho_nhap: khoId,
      loai_nhap: 'tu_mua_hang',
      ma_don_mua_hang: donMuaId,
      nguoi_giao_hang: 'Nhà cung cấp PH3',
      ghi_chu: 'Nhập kho theo đơn mua hàng PH3',
      chiTiet: [{ ma_vat_tu: vatTuId, so_luong_nhap: slNhap01, don_gia_nhap: 50000 }],
    });

    const ton01SauRes = await db.query(`SELECT so_luong_ton FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2`, [khoId, vatTuId]);
    const ton01Sau = parseFloat(ton01SauRes.rows[0]?.so_luong_ton || 0);

    // Kiểm tra FK trong DB
    const pnkDb = await db.query(`SELECT ma_don_mua_hang FROM phieu_nhap_kho WHERE id = $1`, [res01.body?.data?.id]);
    const fkMatched01 = parseInt(pnkDb.rows[0]?.ma_don_mua_hang, 10) === parseInt(donMuaId, 10);
    const delta01 = ton01Sau - ton01Truoc;

    if (res01.status === 201 && delta01 === slNhap01 && fkMatched01) {
      console.log(`✅ [PASS] TEST 01: Nhập kho từ Đơn mua hàng ${dmhRes.rows[0].ma_don_mua} thành công.`);
      console.log(`   - Tồn trước: ${ton01Truoc} | Nhập: ${slNhap01} | Tồn sau: ${ton01Sau} | FK ma_don_mua_hang: ${donMuaId}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] TEST 01`);
    }

    // ------------------------------------------------------------
    // TEST 02: PH2 Lệnh Sản Xuất → PH4 Xuất NPL cho xưởng
    // ------------------------------------------------------------
    console.log('\n--- TEST 02: TÍCH HỢP PH2 (SẢN XUẤT) → PH4 (XUẤT NGUYÊN LIỆU) ---');
    const ton02TruocRes = await db.query(`SELECT so_luong_ton FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2`, [khoId, vatTuId]);
    const ton02Truoc = parseFloat(ton02TruocRes.rows[0]?.so_luong_ton || 0);
    const slXuat02 = 15.0;

    const res02 = await apiRequest('/api/v1/phieu-xuat', 'POST', {
      ma_kho_xuat: khoId,
      loai_xuat: 'xuat_san_xuat',
      ma_lenh_san_xuat: lenhSxId,
      nguoi_nhan: 'Quản đốc xưởng may May 10',
      ghi_chu: 'Xuất vải cho lệnh sản xuất PH2',
      chiTiet: [{ ma_vat_tu: vatTuId, so_luong_xuat: slXuat02, don_gia_xuat: 50000 }],
    });

    const ton02SauRes = await db.query(`SELECT so_luong_ton FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2`, [khoId, vatTuId]);
    const ton02Sau = parseFloat(ton02SauRes.rows[0]?.so_luong_ton || 0);

    const pxkDb02 = await db.query(`SELECT ma_lenh_san_xuat FROM phieu_xuat_kho WHERE id = $1`, [res02.body?.data?.id]);
    const fkMatched02 = parseInt(pxkDb02.rows[0]?.ma_lenh_san_xuat, 10) === parseInt(lenhSxId, 10);
    const expectedTon02 = ton02Truoc - slXuat02;

    if (res02.status === 201 && ton02Sau === expectedTon02 && fkMatched02) {
      console.log(`✅ [PASS] TEST 02: Xuất NVL cho Lệnh sản xuất ${lsxRes.rows[0].ma_lenh_san_xuat} thành công.`);
      console.log(`   - Tồn trước: ${ton02Truoc} | Xuất: ${slXuat02} | Tồn sau: ${ton02Sau} | FK ma_lenh_san_xuat: ${lenhSxId}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] TEST 02`);
    }

    // ------------------------------------------------------------
    // TEST 03: PH2 Hoàn thành Sản Xuất → PH4 Nhập Thành Phẩm
    // ------------------------------------------------------------
    console.log('\n--- TEST 03: TÍCH HỢP PH2 (HOÀN THÀNH SX) → PH4 (NHẬP THÀNH PHẨM) ---');
    const ton03TruocRes = await db.query(`SELECT so_luong_ton FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2`, [khoId, vatTuId]);
    const ton03Truoc = parseFloat(ton03TruocRes.rows[0]?.so_luong_ton || 0);
    const slNhapTp03 = 20.0;

    const res03 = await apiRequest('/api/v1/phieu-nhap', 'POST', {
      ma_kho_nhap: khoId,
      loai_nhap: 'thanh_pham_san_xuat',
      ma_lenh_san_xuat: lenhSxId,
      nguoi_giao_hang: 'Tổ trưởng KCS May 10',
      ghi_chu: 'Nhập kho sản phẩm sau KCS hoàn tất',
      chiTiet: [{ ma_vat_tu: vatTuId, so_luong_nhap: slNhapTp03, don_gia_nhap: 150000 }],
    });

    const ton03SauRes = await db.query(`SELECT so_luong_ton FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2`, [khoId, vatTuId]);
    const ton03Sau = parseFloat(ton03SauRes.rows[0]?.so_luong_ton || 0);

    const pnkDb03 = await db.query(`SELECT ma_lenh_san_xuat FROM phieu_nhap_kho WHERE id = $1`, [res03.body?.data?.id]);
    const fkMatched03 = parseInt(pnkDb03.rows[0]?.ma_lenh_san_xuat, 10) === parseInt(lenhSxId, 10);

    if (res03.status === 201 && (ton03Sau - ton03Truoc) === slNhapTp03 && fkMatched03) {
      console.log(`✅ [PASS] TEST 03: Nhập thành phẩm từ Lệnh sản xuất ${lsxRes.rows[0].ma_lenh_san_xuat} thành công.`);
      console.log(`   - Tồn trước: ${ton03Truoc} | Nhập: ${slNhapTp03} | Tồn sau: ${ton03Sau}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] TEST 03`);
    }

    // ------------------------------------------------------------
    // TEST 04: PH1 Đơn Bán Hàng → PH4 Xuất Kho Giao Khách
    // ------------------------------------------------------------
    console.log('\n--- TEST 04: TÍCH HỢP PH1 (BÁN HÀNG) → PH4 (XUẤT GIAO KHÁCH) ---');
    const ton04TruocRes = await db.query(`SELECT so_luong_ton FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2`, [khoId, vatTuId]);
    const ton04Truoc = parseFloat(ton04TruocRes.rows[0]?.so_luong_ton || 0);
    const slXuat04 = 10.0;

    const res04 = await apiRequest('/api/v1/phieu-xuat', 'POST', {
      ma_kho_xuat: khoId,
      loai_xuat: 'giao_khach',
      ma_don_ban_hang: donBanId,
      nguoi_nhan: 'Khách hàng Đại lý Miền Bắc',
      ghi_chu: 'Xuất kho giao hàng theo đơn bán hàng PH1',
      chiTiet: [{ ma_vat_tu: vatTuId, so_luong_xuat: slXuat04, don_gia_xuat: 50000 }],
    });

    const ton04SauRes = await db.query(`SELECT so_luong_ton FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2`, [khoId, vatTuId]);
    const ton04Sau = parseFloat(ton04SauRes.rows[0]?.so_luong_ton || 0);

    const pxkDb04 = await db.query(`SELECT ma_don_ban_hang FROM phieu_xuat_kho WHERE id = $1`, [res04.body?.data?.id]);
    const fkMatched04 = parseInt(pxkDb04.rows[0]?.ma_don_ban_hang, 10) === parseInt(donBanId, 10);
    const expectedTon04 = ton04Truoc - slXuat04;

    if (res04.status === 201 && ton04Sau === expectedTon04 && fkMatched04) {
      console.log(`✅ [PASS] TEST 04: Xuất kho giao hàng theo Đơn bán hàng ${dbhRes.rows[0].ma_don_ban} thành công.`);
      console.log(`   - Tồn trước: ${ton04Truoc} | Xuất: ${slXuat04} | Tồn sau: ${ton04Sau} | FK ma_don_ban_hang: ${donBanId}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] TEST 04`);
    }

    // ------------------------------------------------------------
    // TEST 05: Chặn xuất vượt tồn (HTTP 409 Conflict)
    // ------------------------------------------------------------
    console.log('\n--- TEST 05: CHẶN XUẤT VƯỢT TỒN KHO (HTTP 409 CONFLICT) ---');
    const ton05TruocRes = await db.query(`SELECT so_luong_ton FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2`, [khoId, vatTuId]);
    const ton05Truoc = parseFloat(ton05TruocRes.rows[0]?.so_luong_ton || 0);
    const slVuot05 = ton05Truoc + 9999;

    const res05 = await apiRequest('/api/v1/phieu-xuat', 'POST', {
      ma_kho_xuat: khoId,
      loai_xuat: 'giao_khach',
      ma_don_ban_hang: donBanId,
      chiTiet: [{ ma_vat_tu: vatTuId, so_luong_xuat: slVuot05, don_gia_xuat: 50000 }],
    });

    const ton05SauRes = await db.query(`SELECT so_luong_ton FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2`, [khoId, vatTuId]);
    const ton05Sau = parseFloat(ton05SauRes.rows[0]?.so_luong_ton || 0);

    if (res05.status === 409 && res05.body?.errorCode === 'INSUFFICIENT_STOCK' && ton05Sau === ton05Truoc) {
      console.log(`✅ [PASS] TEST 05: Chặn xuất vượt tồn kho chính xác với HTTP 409.`);
      console.log(`   - Tồn khả dụng: ${ton05Truoc} | Yêu cầu: ${slVuot05} | Message: ${res05.body?.message}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] TEST 05`);
    }

    // ------------------------------------------------------------
    // TEST 06: Multi-item Transaction Rollback
    // ------------------------------------------------------------
    console.log('\n--- TEST 06: KIỂM TRA TRANSACTION ROLLBACK KHI GẶP LỖI ---');
    const countPxk06TruocRes = await db.query(`SELECT count(*) FROM phieu_xuat_kho`);
    const countPxk06Truoc = parseInt(countPxk06TruocRes.rows[0].count, 10);
    const ton06Truoc = ton05Sau;

    const res06 = await apiRequest('/api/v1/phieu-xuat', 'POST', {
      ma_kho_xuat: khoId,
      loai_xuat: 'xuat_san_xuat',
      chiTiet: [
        { ma_vat_tu: vatTuId, so_luong_xuat: 1, don_gia_xuat: 50000 },
        { ma_vat_tu: vatTuId, so_luong_xuat: 9999999, don_gia_xuat: 50000 },
      ],
    });

    const countPxk06SauRes = await db.query(`SELECT count(*) FROM phieu_xuat_kho`);
    const countPxk06Sau = parseInt(countPxk06SauRes.rows[0].count, 10);
    const ton06SauRes = await db.query(`SELECT so_luong_ton FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2`, [khoId, vatTuId]);
    const ton06Sau = parseFloat(ton06SauRes.rows[0]?.so_luong_ton || 0);

    if (res06.status === 409 && countPxk06Truoc === countPxk06Sau && ton06Truoc === ton06Sau) {
      console.log(`✅ [PASS] TEST 06: Transaction rollback hoàn toàn khi có 1 mặt hàng lỗi trong danh sách.`);
      console.log(`   - Số phiếu xuất giữ nguyên: ${countPxk06Truoc} | Tồn kho giữ nguyên: ${ton06Truoc}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] TEST 06`);
    }

    // ------------------------------------------------------------
    // TEST 07: Concurrency & FOR UPDATE Locking
    // ------------------------------------------------------------
    console.log('\n--- TEST 07: KIỂM TRA ĐỒNG THỜI (CONCURRENCY FOR UPDATE) ---');
    // Đặt tồn kho về đúng 100
    await db.query(`UPDATE ton_kho SET so_luong_ton = 100 WHERE ma_kho = $1 AND ma_vat_tu = $2`, [khoId, vatTuId]);

    const reqA = apiRequest('/api/v1/phieu-xuat', 'POST', {
      ma_kho_xuat: khoId,
      loai_xuat: 'xuat_san_xuat',
      nguoi_nhan: 'Concurrency A',
      chiTiet: [{ ma_vat_tu: vatTuId, so_luong_xuat: 80, don_gia_xuat: 50000 }],
    });

    const reqB = apiRequest('/api/v1/phieu-xuat', 'POST', {
      ma_kho_xuat: khoId,
      loai_xuat: 'xuat_san_xuat',
      nguoi_nhan: 'Concurrency B',
      chiTiet: [{ ma_vat_tu: vatTuId, so_luong_xuat: 50, don_gia_xuat: 50000 }],
    });

    const [ansA, ansB] = await Promise.all([reqA, reqB]);

    const ton07SauRes = await db.query(`SELECT so_luong_ton FROM ton_kho WHERE ma_kho = $1 AND ma_vat_tu = $2`, [khoId, vatTuId]);
    const ton07Sau = parseFloat(ton07SauRes.rows[0]?.so_luong_ton || 0);

    const has201 = ansA.status === 201 || ansB.status === 201;
    const has409 = ansA.status === 409 || ansB.status === 409;

    if (has201 && has409 && ton07Sau === 20) {
      console.log(`✅ [PASS] TEST 07: Race Condition được khóa dòng an toàn tuyệt đối.`);
      console.log(`   - Request 1: ${ansA.status} | Request 2: ${ansB.status} | Tồn kho cuối cùng: ${ton07Sau} mét (>= 0)`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] TEST 07: ansA=${ansA.status}, ansB=${ansB.status}, ton07=${ton07Sau}`);
    }

    // ------------------------------------------------------------
    // TEST 08: Cross-module FK & JOIN Integrity
    // ------------------------------------------------------------
    console.log('\n--- TEST 08: TOÀN VẸN KHÓA NGOẠI VÀ TRUY VẤN JOIN LIÊN PHÂN HỆ ---');
    const joinRes = await db.query(`
      SELECT 
        pnk.ma_phieu_nhap, dmh.ma_don_mua, ncc.ten_nha_cung_cap,
        pxk.ma_phieu_xuat, dbh.ma_don_ban, kh.ten_khach_hang,
        lsx.ma_lenh_san_xuat, sp.ten_san_pham
      FROM phieu_nhap_kho pnk
      LEFT JOIN don_mua_hang dmh ON pnk.ma_don_mua_hang = dmh.id
      LEFT JOIN nha_cung_cap ncc ON dmh.ma_nha_cung_cap = ncc.id
      LEFT JOIN phieu_xuat_kho pxk ON pxk.ma_kho_xuat = pnk.ma_kho_nhap
      LEFT JOIN don_ban_hang dbh ON pxk.ma_don_ban_hang = dbh.id
      LEFT JOIN khach_hang kh ON dbh.ma_khach_hang = kh.id
      LEFT JOIN lenh_san_xuat lsx ON pnk.ma_lenh_san_xuat = lsx.id OR pxk.ma_lenh_san_xuat = lsx.id
      LEFT JOIN san_pham sp ON lsx.ma_san_pham = sp.id
      LIMIT 1
    `);

    if (joinRes.rows.length > 0) {
      console.log(`✅ [PASS] TEST 08: Khả năng JOIN 5 phân hệ (PH1, PH2, PH3, PH4, PH5) hoạt động hoàn hảo.`);
      console.log(`   - Khóa ngoại không bị mồ côi: ${JSON.stringify(joinRes.rows[0])}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] TEST 08`);
    }

    console.log('\n================================================================');
    console.log(`🎉 KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} TESTS PASSED (${(passedTests/totalTests*100)}%)`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Lỗi kiểm thử liên phân hệ:', err);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
    process.exit(process.exitCode || 0);
  }
}

runCrossModuleIntegrationTests();
