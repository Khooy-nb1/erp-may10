/**
 * TEST SUITE: PHASE 5.2 - EXPOSE PH1 -> PH4 FULFILLMENT API + INTEGRATE DELIVERY UI
 *
 * Validates:
 *  - Route exposure: POST /api/v1/sales/giao-hang/:id/fulfill
 *  - Route alias: POST /api/v1/sales/deliveries/:id/fulfill
 *  - Legacy compatibility: POST /api/v1/sales/giao-hang/:id/complete
 *  - RBAC security: ban_hang receives HTTP 403 Forbidden
 *  - Authorized roles: kho and admin receive HTTP 200 OK
 *  - Idempotency guard: duplicate fulfillment calls return HTTP 409 DELIVERY_ALREADY_DISPATCHED
 *  - Real DB state transitions: delivery -> da_giao, stock 1500 -> 500, stock card ISSUE -1000
 *  - Error handling: insufficient stock
 */

'use strict';

const assert = require('assert');
const http = require('http');
const db = require('../src/config/database');
const app = require('../src/app');
const { signToken } = require('../src/middlewares/auth');

const TOKENS = {
  admin: signToken(1),
  ban_hang: signToken(2),
  kho: signToken(5),
  ke_toan: signToken(6),
};

function headers(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) {
    h['Authorization'] = `Bearer ${token}`;
  }
  return h;
}

async function apiCall(baseUrl, method, path, { token, body } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: headers(token),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {}
  return { status: res.status, data };
}

async function resetFixtureGH001() {
  await db.query(`
    DELETE FROM chi_tiet_phieu_xuat WHERE ma_phieu_xuat_kho IN (
      SELECT id FROM phieu_xuat_kho WHERE ma_don_ban_hang = 1 AND loai_xuat = 'giao_khach'
    )
  `);
  await db.query(`
    DELETE FROM phieu_xuat_kho WHERE ma_don_ban_hang = 1 AND loai_xuat = 'giao_khach'
  `);
  await db.query(`
    UPDATE ton_kho SET so_luong_ton = 1500, gia_tri_ton_kho = 330000000 WHERE ma_kho = 2 AND ma_vat_tu = 8
  `);
  await db.query(`
    UPDATE chi_tiet_don_ban_hang SET so_luong_giao = 0, trang_thai = 'chua_giao' WHERE ma_don_ban_hang = 1
  `);
  await db.query(`
    UPDATE giao_hang SET trang_thai = 'cho_giao' WHERE id = 1
  `);
  await db.query(`
    UPDATE don_ban_hang SET trang_thai = 'dang_san_xuat' WHERE id = 1
  `);
}

async function runSuite() {
  console.log('================================================================');
  console.log('TEST SUITE: PHASE 5.2 FULFILLMENT API & UI INTEGRATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function pass(testName, detail = '') {
    passed++;
    console.log(`[PASS] ${testName}` + (detail ? ` -> ${detail}` : ''));
  }

  function fail(testName, err) {
    failed++;
    console.error(`[FAIL] ${testName}`, err);
  }

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    console.log('Preparing GH-2026-001 baseline fixture...');
    await resetFixtureGH001();

    // -------------------------------------------------------------
    // TEST 1: Unauthenticated request rejected with 401
    // -------------------------------------------------------------
    try {
      const res = await apiCall(baseUrl, 'POST', '/api/v1/sales/giao-hang/1/fulfill');
      assert.strictEqual(res.status, 401, 'Should return 401 Unauthorized');
      pass('TEST 01: Anonymous request -> 401 UNAUTHORIZED', `status = ${res.status}`);
    } catch (e) {
      fail('TEST 01: Anonymous request -> 401 UNAUTHORIZED', e);
    }

    // -------------------------------------------------------------
    // TEST 2: RBAC ban_hang forbidden on /sales/giao-hang/:id/fulfill
    // -------------------------------------------------------------
    try {
      const res = await apiCall(baseUrl, 'POST', '/api/v1/sales/giao-hang/1/fulfill', {
        token: TOKENS.ban_hang,
      });
      assert.strictEqual(res.status, 403, 'Should return 403 Forbidden for ban_hang');
      pass('TEST 02: Role ban_hang on /giao-hang/:id/fulfill -> 403 FORBIDDEN', `status = ${res.status}`);
    } catch (e) {
      fail('TEST 02: Role ban_hang on /giao-hang/:id/fulfill -> 403 FORBIDDEN', e);
    }

    // -------------------------------------------------------------
    // TEST 3: RBAC ban_hang forbidden on alias /sales/deliveries/:id/fulfill
    // -------------------------------------------------------------
    try {
      const res = await apiCall(baseUrl, 'POST', '/api/v1/sales/deliveries/1/fulfill', {
        token: TOKENS.ban_hang,
      });
      assert.strictEqual(res.status, 403, 'Should return 403 Forbidden for ban_hang on alias');
      pass('TEST 03: Role ban_hang on /deliveries/:id/fulfill -> 403 FORBIDDEN', `status = ${res.status}`);
    } catch (e) {
      fail('TEST 03: Role ban_hang on /deliveries/:id/fulfill -> 403 FORBIDDEN', e);
    }

    // -------------------------------------------------------------
    // TEST 4: Baseline stock check before fulfillment
    // -------------------------------------------------------------
    let stockBefore = 0;
    try {
      const r = await db.query('SELECT so_luong_ton FROM ton_kho WHERE ma_kho = 2 AND ma_vat_tu = 8');
      stockBefore = parseFloat(r.rows[0].so_luong_ton);
      assert.strictEqual(stockBefore, 1500, 'Baseline stock must be 1500');
      pass('TEST 04: Baseline stock verified', `so_luong_ton = ${stockBefore}`);
    } catch (e) {
      fail('TEST 04: Baseline stock verified', e);
    }

    // -------------------------------------------------------------
    // TEST 5: Role kho calls POST /api/v1/sales/giao-hang/1/fulfill -> 200 OK
    // -------------------------------------------------------------
    let fulfillRes = null;
    try {
      fulfillRes = await apiCall(baseUrl, 'POST', '/api/v1/sales/giao-hang/1/fulfill', {
        token: TOKENS.kho,
      });
      assert.strictEqual(fulfillRes.status, 200, 'Fulfillment should succeed with HTTP 200');
      assert.strictEqual(fulfillRes.data.data.trang_thai, 'da_giao');
      pass('TEST 05: Role kho fulfills delivery -> HTTP 200 OK', `trang_thai = ${fulfillRes.data.data.trang_thai}`);
    } catch (e) {
      fail('TEST 05: Role kho fulfills delivery -> HTTP 200 OK', e);
    }

    // -------------------------------------------------------------
    // TEST 6: Stock deduction and delivery state verified
    // -------------------------------------------------------------
    try {
      const rStock = await db.query('SELECT so_luong_ton FROM ton_kho WHERE ma_kho = 2 AND ma_vat_tu = 8');
      const stockAfter = parseFloat(rStock.rows[0].so_luong_ton);
      assert.strictEqual(stockAfter, 500, 'Stock must decrease from 1500 to 500');

      const rDel = await db.query('SELECT trang_thai FROM giao_hang WHERE id = 1');
      assert.strictEqual(rDel.rows[0].trang_thai, 'da_giao');

      const rLines = await db.query('SELECT so_luong_giao FROM chi_tiet_don_ban_hang WHERE ma_don_ban_hang = 1');
      assert.strictEqual(parseFloat(rLines.rows[0].so_luong_giao), 1000);

      pass('TEST 06: Database state after fulfillment', `stock = ${stockAfter} (1500 -> 500), delivered = 1000, delivery = da_giao`);
    } catch (e) {
      fail('TEST 06: Database state after fulfillment', e);
    }

    // -------------------------------------------------------------
    // TEST 7: PH4 Phiếu xuất kho generated
    // -------------------------------------------------------------
    try {
      const rPxk = await db.query(
        "SELECT id, ma_phieu_xuat, loai_xuat, tong_gia_tri_xuat, trang_thai FROM phieu_xuat_kho WHERE ma_don_ban_hang = 1 AND loai_xuat = 'giao_khach' ORDER BY id DESC LIMIT 1"
      );
      assert.ok(rPxk.rows.length >= 1, 'phieu_xuat_kho record must be created');
      const pxk = rPxk.rows[0];
      assert.strictEqual(pxk.loai_xuat, 'giao_khach');
      assert.strictEqual(pxk.trang_thai, 'da_xuat');

      const rLines = await db.query('SELECT so_luong_xuat, ma_vat_tu FROM chi_tiet_phieu_xuat WHERE ma_phieu_xuat_kho = $1', [pxk.id]);
      assert.ok(rLines.rows.length >= 1);
      assert.strictEqual(parseFloat(rLines.rows[0].so_luong_xuat), 1000);
      assert.strictEqual(String(rLines.rows[0].ma_vat_tu), '8');

      pass('TEST 07: PH4 phieu_xuat_kho and detail verified', `ma_phieu = ${pxk.ma_phieu_xuat}, loai = ${pxk.loai_xuat}, qty = ${rLines.rows[0].so_luong_xuat}`);
    } catch (e) {
      fail('TEST 07: PH4 phieu_xuat_kho and detail verified', e);
    }

    // -------------------------------------------------------------
    // TEST 8: FR-11 Electronic Stock Card (the_kho) ISSUE movement
    // -------------------------------------------------------------
    try {
      const cardRes = await apiCall(baseUrl, 'GET', '/api/v1/ton-kho/the-kho?ma_kho=2&ma_vat_tu=8', {
        token: TOKENS.kho,
      });
      assert.strictEqual(cardRes.status, 200);
      const cardData = cardRes.data.data;
      const movements = cardData.nhatKyBienDong || [];
      const issueMv = movements.find((m) => parseFloat(m.quantity_change) === -1000);
      assert.ok(issueMv, 'Stock card must contain ISSUE movement of -1000 units');
      const closingBal = parseFloat(cardData.soDuCuoiKy ?? cardData.tonHienTai?.so_luong_ton);
      assert.strictEqual(closingBal, 500, 'Closing balance on stock card must be 500');
      pass('TEST 08: Stock Card FR-11 ISSUE movement recorded', `so_du_cuoi = ${closingBal}`);
    } catch (e) {
      fail('TEST 08: Stock Card FR-11 ISSUE movement recorded', e);
    }

    // -------------------------------------------------------------
    // TEST 9: Idempotency on /sales/giao-hang/:id/fulfill -> 409
    // -------------------------------------------------------------
    try {
      const res = await apiCall(baseUrl, 'POST', '/api/v1/sales/giao-hang/1/fulfill', {
        token: TOKENS.kho,
      });
      assert.strictEqual(res.status, 409, 'Duplicate call should return 409 Conflict');
      assert.strictEqual(res.data.errorCode, 'DELIVERY_ALREADY_DISPATCHED');
      pass('TEST 09: Idempotency on /giao-hang/1/fulfill -> 409', `errorCode = ${res.data.errorCode}`);
    } catch (e) {
      fail('TEST 09: Idempotency on /giao-hang/1/fulfill -> 409', e);
    }

    // -------------------------------------------------------------
    // TEST 10: Idempotency on alias /sales/deliveries/:id/fulfill -> 409
    // -------------------------------------------------------------
    try {
      const res = await apiCall(baseUrl, 'POST', '/api/v1/sales/deliveries/1/fulfill', {
        token: TOKENS.admin,
      });
      assert.strictEqual(res.status, 409, 'Duplicate call via alias should return 409 Conflict');
      assert.strictEqual(res.data.errorCode, 'DELIVERY_ALREADY_DISPATCHED');
      pass('TEST 10: Idempotency on alias /deliveries/1/fulfill -> 409', `errorCode = ${res.data.errorCode}`);
    } catch (e) {
      fail('TEST 10: Idempotency on alias /deliveries/1/fulfill -> 409', e);
    }

    // -------------------------------------------------------------
    // TEST 11: Idempotency on legacy endpoint /sales/giao-hang/:id/complete -> 409
    // -------------------------------------------------------------
    try {
      const res = await apiCall(baseUrl, 'POST', '/api/v1/sales/giao-hang/1/complete', {
        token: TOKENS.kho,
      });
      assert.strictEqual(res.status, 409, 'Duplicate call via /complete should return 409 Conflict');
      assert.strictEqual(res.data.errorCode, 'DELIVERY_ALREADY_DISPATCHED');
      pass('TEST 11: Idempotency on /complete endpoint -> 409', `errorCode = ${res.data.errorCode}`);
    } catch (e) {
      fail('TEST 11: Idempotency on /complete endpoint -> 409', e);
    }

    // -------------------------------------------------------------
    // TEST 12: Insufficient stock handling -> 409 INSUFFICIENT_STOCK
    // -------------------------------------------------------------
    let fixtureOrder = null;
    let fixtureDelivery = null;
    try {
      const insOrderRes = await db.query(
        `INSERT INTO don_ban_hang (
           ma_don_ban, ma_khach_hang, ngay_dat_hang, ngay_giao_hang_yc,
           dia_chi_giao_hang, tong_tien_hang, tong_thanh_toan, trang_thai
         ) VALUES ('DBH-TEST-OVERSTOCK-52', 1, NOW(), NOW(), 'Hà Nội', 270000000, 270000000, 'da_xac_nhan')
         RETURNING id`
      );
      fixtureOrder = insOrderRes.rows[0].id;

      await db.query(
        `INSERT INTO chi_tiet_don_ban_hang (
           ma_don_ban_hang, ma_san_pham, so_luong, don_gia, thanh_tien, so_luong_giao, trang_thai
         ) VALUES ($1, 1, 600, 450000, 270000000, 0, 'chua_giao')`,
        [fixtureOrder]
      );

      const insDelRes = await db.query(
        `INSERT INTO giao_hang (
           ma_giao_hang, ma_don_ban_hang, ma_kho, ngay_giao, trang_thai,
           ten_nguoi_nhan, dia_chi_giao
         ) VALUES ('GH-TEST-OVERSTOCK-52', $1, 2, NOW(), 'dang_giao', 'Test Receiver', 'Hà Nội')
         RETURNING id`,
        [fixtureOrder]
      );
      fixtureDelivery = insDelRes.rows[0].id;

      const res = await apiCall(baseUrl, 'POST', `/api/v1/sales/giao-hang/${fixtureDelivery}/fulfill`, {
        token: TOKENS.kho,
      });
      assert.strictEqual(res.status, 409, 'Should return 409 for insufficient stock');
      assert.strictEqual(res.data.errorCode, 'INSUFFICIENT_STOCK');

      pass('TEST 12: Insufficient stock returns 409 INSUFFICIENT_STOCK', `errorCode = ${res.data.errorCode}`);
    } catch (e) {
      fail('TEST 12: Insufficient stock returns 409 INSUFFICIENT_STOCK', e);
    } finally {
      if (fixtureDelivery) {
        await db.query('DELETE FROM giao_hang WHERE id = $1', [fixtureDelivery]);
      }
      if (fixtureOrder) {
        await db.query('DELETE FROM chi_tiet_don_ban_hang WHERE ma_don_ban_hang = $1', [fixtureOrder]);
        await db.query('DELETE FROM don_ban_hang WHERE id = $1', [fixtureOrder]);
      }
    }

    // -------------------------------------------------------------
    // TEST 13: Clean alias dispatch test with admin on dedicated fixture
    // -------------------------------------------------------------
    let aliasOrder = null;
    let aliasDelivery = null;
    try {
      const insOrderRes = await db.query(
        `INSERT INTO don_ban_hang (
           ma_don_ban, ma_khach_hang, ngay_dat_hang, ngay_giao_hang_yc,
           dia_chi_giao_hang, tong_tien_hang, tong_thanh_toan, trang_thai
         ) VALUES ('DBH-TEST-ALIAS-52', 1, NOW(), NOW(), 'Hà Nội', 45000000, 45000000, 'da_xac_nhan')
         RETURNING id`
      );
      aliasOrder = insOrderRes.rows[0].id;

      await db.query(
        `INSERT INTO chi_tiet_don_ban_hang (
           ma_don_ban_hang, ma_san_pham, so_luong, don_gia, thanh_tien, so_luong_giao, trang_thai
         ) VALUES ($1, 1, 100, 450000, 45000000, 0, 'chua_giao')`,
        [aliasOrder]
      );

      const insDelRes = await db.query(
        `INSERT INTO giao_hang (
           ma_giao_hang, ma_don_ban_hang, ma_kho, ngay_giao, trang_thai,
           ten_nguoi_nhan, dia_chi_giao
         ) VALUES ('GH-TEST-ALIAS-52', $1, 2, NOW(), 'cho_giao', 'Admin Receiver', 'Hà Nội')
         RETURNING id`,
        [aliasOrder]
      );
      aliasDelivery = insDelRes.rows[0].id;

      const res = await apiCall(baseUrl, 'POST', `/api/v1/sales/deliveries/${aliasDelivery}/fulfill`, {
        token: TOKENS.admin,
      });
      assert.strictEqual(res.status, 200, 'Admin fulfillment via /deliveries alias should succeed with 200');
      assert.strictEqual(res.data.data.trang_thai, 'da_giao');

      const chk = await db.query('SELECT so_luong_ton FROM ton_kho WHERE ma_kho = 2 AND ma_vat_tu = 8');
      assert.strictEqual(parseFloat(chk.rows[0].so_luong_ton), 400);

      pass('TEST 13: Dedicated fixture on /deliveries/:id/fulfill with admin -> 200 OK', `trang_thai = ${res.data.data.trang_thai}`);
    } catch (e) {
      fail('TEST 13: Dedicated fixture on /deliveries/:id/fulfill with admin -> 200 OK', e);
    } finally {
      if (aliasDelivery) {
        await db.query(`
          DELETE FROM chi_tiet_phieu_xuat WHERE ma_phieu_xuat_kho IN (
            SELECT id FROM phieu_xuat_kho WHERE ma_don_ban_hang = $1
          )
        `, [aliasOrder]);
        await db.query('DELETE FROM phieu_xuat_kho WHERE ma_don_ban_hang = $1', [aliasOrder]);
        await db.query('DELETE FROM giao_hang WHERE id = $1', [aliasDelivery]);
      }
      if (aliasOrder) {
        await db.query('DELETE FROM chi_tiet_don_ban_hang WHERE ma_don_ban_hang = $1', [aliasOrder]);
        await db.query('DELETE FROM don_ban_hang WHERE id = $1', [aliasOrder]);
      }
      // Revert stock from 400 back to 500
      await db.query('UPDATE ton_kho SET so_luong_ton = 500 WHERE ma_kho = 2 AND ma_vat_tu = 8');
    }

  } finally {
    server.close();
  }

  console.log('\n================================================================');
  console.log(`KẾT QUẢ TEST PHASE 5.2: ${passed} PASS / ${failed} FAIL (TỔNG: ${passed + failed} TESTS)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error('Suite failure:', err);
  process.exit(1);
});
