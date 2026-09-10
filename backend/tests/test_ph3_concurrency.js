/**
 * Concurrency & Race Condition Test for ERP May 10 - PH3: Mua hàng & Nhà cung cấp
 * Specifically proves prevention of:
 * - Double Approval (Concurrent approvals on same PO)
 * - Double Cancel (Concurrent cancellations on same PO)
 * - Duplicate Status Transitions
 */

const http = require('http');
const db = require('../src/config/database');
const { signToken } = require('../src/middlewares/auth');

const PORT = 5124;
let server;

function request(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || signToken(4)}`,
    };
    if (postData) headers['Content-Length'] = Buffer.byteLength(postData);

    const req = http.request(
      { hostname: '127.0.0.1', port: PORT, path, method, headers },
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

async function setupConcurrencyDb() {
  try {
    await db.query('SELECT 1');
  } catch (err) {
    const { newDb } = require('pg-mem');
    const memDb = newDb();
    memDb.public.registerFunction({
      name: 'now',
      returns: memDb.public.getType('timestamp with time zone') || memDb.public.getType('timestamp'),
      implementation: () => new Date(),
    });

    const { Pool } = memDb.adapters.createPg();
    const memPool = new Pool();

    db.pool = memPool;
    db.query = (text, params) => memPool.query(text, params);
    db.getClient = () => memPool.connect();

    await memPool.query(`
      CREATE TABLE IF NOT EXISTS nguoi_dung (
        id SERIAL PRIMARY KEY, ho_ten VARCHAR(150), email VARCHAR(100) UNIQUE,
        mat_khau VARCHAR(255), vai_tro VARCHAR(50), phong_ban VARCHAR(100),
        trang_thai VARCHAR(20) DEFAULT 'hoat_dong', ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(), nguoi_tao BIGINT, nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS don_vi_tinh (
        id SERIAL PRIMARY KEY, ma_don_vi VARCHAR(20) UNIQUE, ten_don_vi VARCHAR(100),
        ghi_chu TEXT, trang_thai VARCHAR(20) DEFAULT 'hoat_dong', ngay_tao TIMESTAMPTZ DEFAULT NOW(), nguoi_tao BIGINT
      );

      CREATE TABLE IF NOT EXISTS kho (
        id SERIAL PRIMARY KEY, ma_kho VARCHAR(50) UNIQUE, ten_kho VARCHAR(200),
        dia_chi TEXT, dien_tich NUMERIC(18,3), suc_chua NUMERIC(18,3), loai_kho VARCHAR(50),
        nguoi_quan_ly BIGINT, trang_thai VARCHAR(20) DEFAULT 'hoat_dong', ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(), nguoi_tao BIGINT, nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS nha_cung_cap (
        id SERIAL PRIMARY KEY, ma_nha_cung_cap VARCHAR(50) UNIQUE, ten_nha_cung_cap VARCHAR(200),
        ma_so_thue VARCHAR(20), dia_chi TEXT, quoc_gia VARCHAR(100) DEFAULT 'Viet Nam',
        nguoi_lien_he VARCHAR(150), so_dien_thoai VARCHAR(20), email VARCHAR(100), loai_hang_cung_cap TEXT,
        han_muc_tin_dung NUMERIC(18,2) DEFAULT 0, so_ngay_gia_han INTEGER DEFAULT 30, diem_danh_gia NUMERIC(3,1) DEFAULT 0,
        trang_thai VARCHAR(20) DEFAULT 'hoat_dong', ngay_tao TIMESTAMPTZ DEFAULT NOW(), ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT, nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS vat_tu (
        id SERIAL PRIMARY KEY, ma_vat_tu VARCHAR(50) UNIQUE, ten_vat_tu VARCHAR(200), loai_vat_tu VARCHAR(50),
        ma_don_vi_tinh BIGINT, quy_cach VARCHAR(100), muc_ton_toi_thieu NUMERIC(18,3) DEFAULT 0,
        muc_ton_toi_da NUMERIC(18,3), gia_nhap_trung_binh NUMERIC(18,2) DEFAULT 0, nha_cung_cap_chinh BIGINT,
        trang_thai VARCHAR(20) DEFAULT 'dang_su_dung', ngay_tao TIMESTAMPTZ DEFAULT NOW(), ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(),
        nguoi_tao BIGINT, nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS yeu_cau_mua_hang (
        id SERIAL PRIMARY KEY, ma_yeu_cau_mua VARCHAR(50) UNIQUE, nguon_yeu_cau VARCHAR(20),
        ma_nhu_cau_npl BIGINT, ngay_yeu_cau TIMESTAMPTZ DEFAULT NOW(), nguoi_yeu_cau BIGINT,
        nguoi_phe_duyet BIGINT, ngay_phe_duyet TIMESTAMPTZ, ghi_chu TEXT,
        trang_thai VARCHAR(20) DEFAULT 'cho_duyet', ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(), nguoi_tao BIGINT, nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS don_mua_hang (
        id SERIAL PRIMARY KEY, ma_don_mua VARCHAR(50) UNIQUE, ma_nha_cung_cap BIGINT,
        ma_yeu_cau_mua_hang BIGINT, ngay_dat_hang TIMESTAMPTZ, ngay_giao_hang_yc TIMESTAMPTZ,
        tong_tien_hang NUMERIC(18,2), tien_thue NUMERIC(18,2) DEFAULT 0, tong_thanh_toan NUMERIC(18,2),
        dieu_kien_thanh_toan TEXT, nguoi_dat_hang BIGINT, ghi_chu TEXT,
        trang_thai VARCHAR(20) DEFAULT 'cho_duyet', ngay_tao TIMESTAMPTZ DEFAULT NOW(),
        ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(), nguoi_tao BIGINT, nguoi_cap_nhat BIGINT
      );

      CREATE TABLE IF NOT EXISTS chi_tiet_don_mua (
        id SERIAL PRIMARY KEY, ma_don_mua_hang BIGINT, ma_vat_tu BIGINT, so_luong_dat NUMERIC(18,3),
        don_gia NUMERIC(18,2), thanh_tien NUMERIC(18,2), so_luong_da_nhap NUMERIC(18,3) DEFAULT 0, ghi_chu TEXT,
        ngay_tao TIMESTAMPTZ DEFAULT NOW(), ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW(), nguoi_tao BIGINT, nguoi_cap_nhat BIGINT
      );

      INSERT INTO nguoi_dung (id, ho_ten, email, mat_khau, vai_tro, phong_ban, trang_thai) VALUES
      (4, 'Lê Thị Mua', 'muahang@may10.vn', 'hash', 'mua_hang', 'Cung Ứng', 'hoat_dong');

      INSERT INTO nha_cung_cap (ma_nha_cung_cap, ten_nha_cung_cap, dia_chi, nguoi_lien_he, so_dien_thoai, email) VALUES
      ('NCC-CC-01', 'NCC Concurrency Test', 'Hà Nội', 'Đại diện', '0912345678', 'cc@may10.vn');

      INSERT INTO vat_tu (id, ma_vat_tu, ten_vat_tu, loai_vat_tu) VALUES
      (1, 'VT-CC-01', 'Vải Concurrency', 'vai_chinh');
    `);
  }
}

async function runConcurrencyTests() {
  console.log('================================================================');
  console.log('⚡ BẮT ĐẦU KIỂM THỬ TRANH CHẤP & ĐỒNG THỜI (CONCURRENCY LOCKING)');
  console.log('================================================================\n');

  await setupConcurrencyDb();

  const app = require('../src/app');
  server = app.listen(PORT);

  const token = signToken(4);
  let passCount = 0;
  let failCount = 0;

  function assert(cond, msg) {
    if (cond) {
      passCount++;
      console.log(`  ✅ [PASS] ${msg}`);
    } else {
      failCount++;
      console.error(`  ❌ [FAIL] ${msg}`);
      process.exitCode = 1;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // SCENARIO 1: Race condition on Approval (10 concurrent requests to approve the same PO)
    // -------------------------------------------------------------------------
    console.log('1. Kịch bản 1: Tranh chấp phê duyệt đồng thời (Race Condition: Double Approval):');
    // Tạo 1 PO mới
    const poRes = await request(
      '/api/v1/purchasing/purchase-orders',
      'POST',
      {
        ma_nha_cung_cap: 1,
        ngay_giao_hang_yc: new Date(Date.now() + 86400000 * 7).toISOString(),
        chiTiet: [{ ma_vat_tu: 1, so_luong_dat: 100, don_gia: 50000 }],
      },
      token
    );
    const poId = poRes.data?.data?.id;

    // Bắn 10 request phê duyệt song song đồng thời bằng Promise.all
    console.log(`   Phát 10 requests phê duyệt đồng thời cho PO ID ${poId}...`);
    const approvePromises = Array.from({ length: 10 }).map(() =>
      request(`/api/v1/purchasing/purchase-orders/${poId}/approve`, 'POST', {}, token)
    );
    const approveResults = await Promise.all(approvePromises);

    const successApprovals = approveResults.filter((r) => r.status === 200);
    const conflictApprovals = approveResults.filter((r) => r.status === 409);

    assert(
      successApprovals.length === 1,
      `Chính xác 1 request thành công (200 OK) khi phê duyệt đồng thời (Thực tế: ${successApprovals.length})`
    );
    assert(
      conflictApprovals.length === 9,
      `9 requests còn lại bị chặn với HTTP 409 Conflict (Thực tế: ${conflictApprovals.length})`
    );

    // Kiểm tra trạng thái cuối cùng của PO trong DB
    const finalPO = await request(`/api/v1/purchasing/purchase-orders/${poId}`, 'GET', null, token);
    assert(
      finalPO.data?.data?.trang_thai === 'da_gui_ncc',
      `Trạng thái PO cuối cùng chính xác là 'da_gui_ncc' (Nhận: ${finalPO.data?.data?.trang_thai})`
    );

    // -------------------------------------------------------------------------
    // SCENARIO 2: Race condition on Cancel (10 concurrent requests to cancel the same PO)
    // -------------------------------------------------------------------------
    console.log('\n2. Kịch bản 2: Tranh chấp hủy đơn đồng thời (Race Condition: Double Cancel):');
    const poForCancel = await request(
      '/api/v1/purchasing/purchase-orders',
      'POST',
      {
        ma_nha_cung_cap: 1,
        ngay_giao_hang_yc: new Date(Date.now() + 86400000 * 7).toISOString(),
        chiTiet: [{ ma_vat_tu: 1, so_luong_dat: 50, don_gia: 40000 }],
      },
      token
    );
    const cancelPoId = poForCancel.data?.data?.id;

    console.log(`   Phát 10 requests hủy đơn đồng thời cho PO ID ${cancelPoId}...`);
    const cancelPromises = Array.from({ length: 10 }).map((_, idx) =>
      request(
        `/api/v1/purchasing/purchase-orders/${cancelPoId}/cancel`,
        'POST',
        { ly_do_huy: `Concurrent cancel #${idx}` },
        token
      )
    );
    const cancelResults = await Promise.all(cancelPromises);

    const successCancels = cancelResults.filter((r) => r.status === 200);
    const conflictCancels = cancelResults.filter((r) => r.status === 409);

    assert(
      successCancels.length === 1,
      `Chính xác 1 request hủy thành công (200 OK) (Thực tế: ${successCancels.length})`
    );
    assert(
      conflictCancels.length === 9,
      `9 requests hủy còn lại bị chặn với HTTP 409 Conflict (Thực tế: ${conflictCancels.length})`
    );

    const finalCancelPO = await request(`/api/v1/purchasing/purchase-orders/${cancelPoId}`, 'GET', null, token);
    assert(
      finalCancelPO.data?.data?.trang_thai === 'huy',
      `Trạng thái PO cuối cùng chính xác là 'huy' (Nhận: ${finalCancelPO.data?.data?.trang_thai})`
    );

    // -------------------------------------------------------------------------
    // SCENARIO 3: Race condition on Status Transition (10 concurrent requests PENDING -> CONFIRMED)
    // -------------------------------------------------------------------------
    console.log('\n3. Kịch bản 3: Tranh chấp chuyển trạng thái đồng thời (Duplicate Status Transition):');
    console.log(`   Phát 10 requests chuyển trạng thái sang 'da_xac_nhan' cho PO ID ${poId} (hiện là 'da_gui_ncc')...`);
    const transitionPromises = Array.from({ length: 10 }).map((_, idx) =>
      request(
        `/api/v1/purchasing/purchase-orders/${poId}/status`,
        'POST',
        { trang_thai_moi: 'da_xac_nhan', ghi_chu: `Xác nhận giao dịch concurrent #${idx}` },
        token
      )
    );
    const transitionResults = await Promise.all(transitionPromises);

    const successTransitions = transitionResults.filter((r) => r.status === 200);
    const conflictTransitions = transitionResults.filter((r) => r.status === 409);

    assert(
      successTransitions.length === 1,
      `Chính xác 1 request chuyển trạng thái thành công (200 OK) (Thực tế: ${successTransitions.length})`
    );
    assert(
      conflictTransitions.length === 9,
      `9 requests chuyển trạng thái còn lại bị chặn với HTTP 409 Conflict (Thực tế: ${conflictTransitions.length})`
    );

    const finalTransPO = await request(`/api/v1/purchasing/purchase-orders/${poId}`, 'GET', null, token);
    assert(
      finalTransPO.data?.data?.trang_thai === 'da_xac_nhan',
      `Trạng thái PO sau chuyển đổi chính xác là 'da_xac_nhan' (Nhận: ${finalTransPO.data?.data?.trang_thai})`
    );
  } catch (err) {
    console.error('Lỗi kiểm thử tranh chấp:', err);
    failCount++;
  } finally {
    if (server) server.close();
  }

  console.log('\n================================================================');
  console.log(`📊 KẾT QUẢ KIỂM THỬ TRANH CHẤP: ${passCount} PASS, ${failCount} FAIL`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 CƠ CHẾ KHÓA DÒNG SELECT ... FOR UPDATE HOẠT ĐỘNG HOÀN HẢO!\n');
    process.exit(0);
  }
}

if (require.main === module) {
  runConcurrencyTests();
}

module.exports = { runConcurrencyTests };
