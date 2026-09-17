/**
 * TEST SUITE: PH1 -> PH4 FULFILLMENT ORCHESTRATION
 *
 * Validates the atomic integration between PH1 Sales Delivery and PH4 Warehouse Stock Issue:
 *  - Single-client ACID transaction
 *  - Exclusive row locking (SELECT ... FOR UPDATE)
 *  - Idempotency against duplicate dispatch (HTTP 409 DELIVERY_ALREADY_DISPATCHED)
 *  - Inventory non-negative constraint and stock deduction (HTTP 409 INSUFFICIENT_STOCK)
 *  - Product to Finished Goods material resolution (1:1 matching on code)
 *  - Automatic PH4 Export Ticket creation (phieu_xuat_kho & chi_tiet_phieu_xuat)
 *  - Electronic Stock Card (the_kho) ISSUE movements and running balance integrity
 *  - Cumulative order line fulfillment tracking
 *  - RBAC permission enforcement (ban_hang denied, kho/admin permitted)
 *  - Concurrency safety under simultaneous requests
 *  - Rollback safety ensuring zero partial state
 */

'use strict';

const assert = require('assert');
const http = require('http');
const db = require('../src/config/database');
const app = require('../src/app');
const { signToken } = require('../src/middlewares/auth');
const { dispatchFulfillmentDelivery } = require('../src/services/sales/fulfillment.service');

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
  } catch (_) {
    data = null;
  }
  return { status: res.statusCode || res.status, body: data };
}

let passed = 0;
let failed = 0;
const testDetails = [];

function recordPass(testName, detail = '') {
  passed++;
  testDetails.push({ name: testName, status: 'PASS', detail });
  console.log(`[PASS] ${testName}${detail ? ' -> ' + detail : ''}`);
}

function recordFail(testName, error) {
  failed++;
  testDetails.push({ name: testName, status: 'FAIL', error: error?.message || String(error) });
  console.error(`[FAIL] ${testName}:`, error?.message || error);
}

async function runFulfillmentSuite() {
  console.log('================================================================');
  console.log('TEST SUITE: PH1 -> PH4 FULFILLMENT ORCHESTRATION INTEGRATION');
  console.log('================================================================\n');

  // Start internal server for HTTP API testing
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    // 0. RESET BASELINE FIXTURE FOR GH-2026-001 IF NEEDED FOR RE-RUNNABILITY
    const currentGH = await db.query('SELECT trang_thai FROM giao_hang WHERE id = 1');
    if (currentGH.rows[0]?.trang_thai === 'da_giao') {
      console.log('Preparing GH-2026-001 fixture for clean test execution...');
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

    // -------------------------------------------------------------------------
    // TEST 01: Resolve SP-SM-NAM-01 -> vat_tu ID 8
    // -------------------------------------------------------------------------
    try {
      const vtRes = await db.query(
        `SELECT id, ma_vat_tu, ten_vat_tu, loai_vat_tu
         FROM vat_tu
         WHERE ma_vat_tu = 'SP-SM-NAM-01' AND loai_vat_tu = 'thanh_pham'`
      );
      assert.strictEqual(vtRes.rows.length, 1, 'Exactly one finished goods record expected');
      assert.strictEqual(String(vtRes.rows[0].id), '8', 'vat_tu id must be 8');
      assert.strictEqual(vtRes.rows[0].loai_vat_tu, 'thanh_pham', 'loai_vat_tu must be thanh_pham');
      recordPass('TEST 01: Resolve SP-SM-NAM-01 -> vat_tu ID 8', `vat_tu.id = ${vtRes.rows[0].id}`);
    } catch (err) {
      recordFail('TEST 01: Resolve SP-SM-NAM-01 -> vat_tu ID 8', err);
    }

    // -------------------------------------------------------------------------
    // TEST 02: Delivery GH-2026-001 -> quantity 1000
    // -------------------------------------------------------------------------
    try {
      const ghRes = await db.query(
        `SELECT g.id, g.ma_giao_hang, g.ma_don_ban_hang, g.ma_kho, g.trang_thai,
                ct.so_luong - COALESCE(ct.so_luong_giao, 0) AS remaining_qty
         FROM giao_hang g
         JOIN chi_tiet_don_ban_hang ct ON g.ma_don_ban_hang = ct.ma_don_ban_hang
         WHERE g.id = 1`
      );
      assert.strictEqual(ghRes.rows.length, 1, 'Delivery GH-2026-001 must exist');
      const gh = ghRes.rows[0];
      assert.strictEqual(gh.ma_giao_hang, 'GH-2026-001', 'Delivery code must match');
      assert.strictEqual(parseFloat(gh.remaining_qty), 1000, 'Remaining dispatch quantity must be 1000');
      recordPass('TEST 02: Delivery GH-2026-001 -> quantity 1000', `Delivery ${gh.ma_giao_hang}, Qty = ${gh.remaining_qty}`);
    } catch (err) {
      recordFail('TEST 02: Delivery GH-2026-001 -> quantity 1000', err);
    }

    // -------------------------------------------------------------------------
    // TEST 03: Stock before = 1500
    // -------------------------------------------------------------------------
    try {
      const tkRes = await db.query(
        `SELECT so_luong_ton, gia_tri_ton_kho FROM ton_kho WHERE ma_kho = 2 AND ma_vat_tu = 8`
      );
      assert.strictEqual(tkRes.rows.length, 1, 'Stock row for vat_tu 8 at kho 2 must exist');
      const stockBefore = parseFloat(tkRes.rows[0].so_luong_ton);
      assert.strictEqual(stockBefore, 1500, 'Stock before fulfillment must be exactly 1500');
      recordPass('TEST 03: Stock before = 1500', `Kho 2, vat_tu 8 = ${stockBefore} Cái`);
    } catch (err) {
      recordFail('TEST 03: Stock before = 1500', err);
    }

    // -------------------------------------------------------------------------
    // TEST 04: Successful fulfillment -> HTTP 200/201 theo contract hiện tại
    // -------------------------------------------------------------------------
    let fulfillmentResponse = null;
    try {
      // Execute dispatch as warehouse manager (kho)
      fulfillmentResponse = await apiCall(baseUrl, 'POST', '/api/v1/sales/giao-hang/1/complete', {
        token: TOKENS.kho,
        body: {},
      });
      assert.strictEqual(fulfillmentResponse.status, 200, 'Fulfillment endpoint must return HTTP 200');
      assert.strictEqual(fulfillmentResponse.body?.success, true, 'Response body success must be true');
      assert.strictEqual(fulfillmentResponse.body?.data?.trang_thai, 'da_giao', 'Delivery status must be da_giao');
      recordPass('TEST 04: Successful fulfillment -> HTTP 200', `Status: ${fulfillmentResponse.status}, Delivery ID: 1`);
    } catch (err) {
      recordFail('TEST 04: Successful fulfillment -> HTTP 200', err);
    }

    // -------------------------------------------------------------------------
    // TEST 05: Stock after = 500
    // -------------------------------------------------------------------------
    try {
      const tkAfterRes = await db.query(
        `SELECT so_luong_ton, gia_tri_ton_kho FROM ton_kho WHERE ma_kho = 2 AND ma_vat_tu = 8`
      );
      const stockAfter = parseFloat(tkAfterRes.rows[0].so_luong_ton);
      assert.strictEqual(stockAfter, 500, 'Stock after fulfillment must be exactly 500 (1500 - 1000)');
      recordPass('TEST 05: Stock after = 500', `Remaining stock = ${stockAfter} Cái (DATA MUTATION EXPECTED: 1500 -> 500)`);
    } catch (err) {
      recordFail('TEST 05: Stock after = 500', err);
    }

    // -------------------------------------------------------------------------
    // TEST 06: Delivery = da_giao
    // -------------------------------------------------------------------------
    try {
      const ghAfter = await db.query('SELECT trang_thai, ngay_cap_nhat, nguoi_cap_nhat FROM giao_hang WHERE id = 1');
      assert.strictEqual(ghAfter.rows[0].trang_thai, 'da_giao', 'giao_hang status must be da_giao');
      recordPass('TEST 06: Delivery = da_giao', `giao_hang.trang_thai = ${ghAfter.rows[0].trang_thai}`);
    } catch (err) {
      recordFail('TEST 06: Delivery = da_giao', err);
    }

    // -------------------------------------------------------------------------
    // TEST 07: so_luong_da_giao tăng đúng quantity
    // -------------------------------------------------------------------------
    try {
      const ctRes = await db.query(
        `SELECT so_luong, so_luong_giao, trang_thai FROM chi_tiet_don_ban_hang WHERE ma_don_ban_hang = 1`
      );
      const line = ctRes.rows[0];
      assert.strictEqual(parseFloat(line.so_luong_giao), 1000, 'so_luong_giao must be updated to 1000');
      assert.strictEqual(line.trang_thai, 'da_giao_du', 'Line status must be da_giao_du');
      recordPass('TEST 07: so_luong_da_giao tăng đúng quantity', `so_luong_giao = ${line.so_luong_giao} / ${line.so_luong}`);
    } catch (err) {
      recordFail('TEST 07: so_luong_da_giao tăng đúng quantity', err);
    }

    // -------------------------------------------------------------------------
    // TEST 08: phieu_xuat_kho được tạo
    // -------------------------------------------------------------------------
    let createdPxkId = null;
    try {
      const pxkRes = await db.query(
        `SELECT id, ma_phieu_xuat, loai_xuat, ma_don_ban_hang, ma_kho_xuat,
                tong_gia_tri_xuat, trang_thai
         FROM phieu_xuat_kho
         WHERE ma_don_ban_hang = 1 AND loai_xuat = 'giao_khach'
         ORDER BY id DESC LIMIT 1`
      );
      assert.strictEqual(pxkRes.rows.length, 1, 'phieu_xuat_kho must be created');
      const pxk = pxkRes.rows[0];
      createdPxkId = pxk.id;
      assert.strictEqual(pxk.loai_xuat, 'giao_khach', 'loai_xuat must be giao_khach');
      assert.strictEqual(String(pxk.ma_kho_xuat), '2', 'ma_kho_xuat must be 2');
      assert.strictEqual(pxk.trang_thai, 'da_xuat', 'trang_thai must be da_xuat');
      recordPass('TEST 08: phieu_xuat_kho được tạo', `Mã: ${pxk.ma_phieu_xuat}, Loại: ${pxk.loai_xuat}`);
    } catch (err) {
      recordFail('TEST 08: phieu_xuat_kho được tạo', err);
    }

    // -------------------------------------------------------------------------
    // TEST 09: chi_tiet_phieu_xuat được tạo
    // -------------------------------------------------------------------------
    try {
      assert(createdPxkId, 'phieu_xuat_kho ID must exist');
      const ctPxkRes = await db.query(
        `SELECT id, ma_phieu_xuat_kho, ma_vat_tu, so_luong_xuat, don_gia_xuat, thanh_tien
         FROM chi_tiet_phieu_xuat
         WHERE ma_phieu_xuat_kho = $1`,
        [createdPxkId]
      );
      assert.strictEqual(ctPxkRes.rows.length, 1, 'chi_tiet_phieu_xuat must have 1 row');
      const item = ctPxkRes.rows[0];
      assert.strictEqual(String(item.ma_vat_tu), '8', 'ma_vat_tu must be 8');
      assert.strictEqual(parseFloat(item.so_luong_xuat), 1000, 'so_luong_xuat must be 1000');
      recordPass('TEST 09: chi_tiet_phieu_xuat được tạo', `Vật tư ID: ${item.ma_vat_tu}, Xuất: ${item.so_luong_xuat}`);
    } catch (err) {
      recordFail('TEST 09: chi_tiet_phieu_xuat được tạo', err);
    }

    // -------------------------------------------------------------------------
    // TEST 10: Stock Card có ISSUE -1000
    // -------------------------------------------------------------------------
    try {
      const theKhoRes = await apiCall(baseUrl, 'GET', '/api/v1/ton-kho/the-kho?ma_kho=2&ma_vat_tu=8', {
        token: TOKENS.kho,
      });
      assert.strictEqual(theKhoRes.status, 200, 'Stock card API must return HTTP 200');
      const moves = theKhoRes.body?.data?.nhatKyBienDong || [];
      assert(moves.length > 0, 'Stock card must contain movement ledger records');

      const issueMove = moves.find(
        (m) => m.movement_type === 'ISSUE' && parseFloat(m.quantity_change) === -1000
      );
      assert(issueMove, 'Stock card must contain movement with type ISSUE and quantity_change = -1000');
      assert.strictEqual(parseFloat(issueMove.so_luong), 1000, 'Movement so_luong must be 1000');
      assert.strictEqual(issueMove.huong_bien_dong, 'giam', 'huong_bien_dong must be giam');
      recordPass('TEST 10: Stock Card có ISSUE -1000', `Chuyển động: ${issueMove.ma_chung_tu}, Delta = ${issueMove.quantity_change}`);
    } catch (err) {
      recordFail('TEST 10: Stock Card có ISSUE -1000', err);
    }

    // -------------------------------------------------------------------------
    // TEST 11: Running balance đúng
    // -------------------------------------------------------------------------
    try {
      const theKhoRes = await apiCall(baseUrl, 'GET', '/api/v1/ton-kho/the-kho?ma_kho=2&ma_vat_tu=8', {
        token: TOKENS.kho,
      });
      const data = theKhoRes.body?.data;
      const moves = data?.nhatKyBienDong || [];
      const currentStock = parseFloat(data?.soDuCuoiKy ?? data?.tonHienTai?.so_luong_ton);

      let prevBalance = parseFloat(moves[0]?.opening_balance ?? (parseFloat(moves[0]?.running_balance) - parseFloat(moves[0]?.quantity_change)));
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        const qtyChange = parseFloat(m.quantity_change);
        const runningBal = parseFloat(m.running_balance);
        const expectedBal = prevBalance + qtyChange;
        assert(
          Math.abs(runningBal - expectedBal) < 0.001,
          `Running balance at line ${i + 1} (${runningBal}) must equal prev (${prevBalance}) + change (${qtyChange})`
        );
        prevBalance = runningBal;
      }

      // Final running balance must match current stock in ton_kho (500)
      const lastBal = parseFloat(moves[moves.length - 1].running_balance);
      assert.strictEqual(lastBal, 500, 'Final running balance must match current stock of 500');
      assert.strictEqual(currentStock, 500, 'Reported stock must match 500');
      recordPass('TEST 11: Running balance đúng', `Sổ thẻ kho cân đối 100%, Số dư cuối: ${lastBal} Cái`);
    } catch (err) {
      recordFail('TEST 11: Running balance đúng', err);
    }

    // -------------------------------------------------------------------------
    // TEST 12: Dispatch same delivery again -> 409 DELIVERY_ALREADY_DISPATCHED
    // -------------------------------------------------------------------------
    try {
      const repeatRes = await apiCall(baseUrl, 'POST', '/api/v1/sales/giao-hang/1/complete', {
        token: TOKENS.kho,
        body: {},
      });
      assert.strictEqual(repeatRes.status, 409, 'Repeat dispatch must return HTTP 409');
      assert.strictEqual(
        repeatRes.body?.errorCode,
        'DELIVERY_ALREADY_DISPATCHED',
        'Error code must be DELIVERY_ALREADY_DISPATCHED'
      );
      recordPass(
        'TEST 12: Dispatch same delivery again -> 409 DELIVERY_ALREADY_DISPATCHED',
        `HTTP ${repeatRes.status}, errorCode = ${repeatRes.body?.errorCode}`
      );
    } catch (err) {
      recordFail('TEST 12: Dispatch same delivery again -> 409 DELIVERY_ALREADY_DISPATCHED', err);
    }

    // -------------------------------------------------------------------------
    // TEST 13: Insufficient stock -> 409 INSUFFICIENT_STOCK
    // -------------------------------------------------------------------------
    let fixtureOrder = null;
    let fixtureDelivery = null;
    try {
      // Create a temporary delivery for order requesting more than remaining stock (e.g. 600 > 500)
      const insOrderRes = await db.query(
        `INSERT INTO don_ban_hang (
           ma_don_ban, ma_khach_hang, ngay_dat_hang, ngay_giao_hang_yc,
           dia_chi_giao_hang, tong_tien_hang, tong_thanh_toan, trang_thai
         ) VALUES ('DBH-TEST-OVERSTOCK', 1, NOW(), NOW(), 'Hà Nội', 270000000, 270000000, 'da_xac_nhan')
         RETURNING id`
      );
      fixtureOrder = insOrderRes.rows[0].id;

      await db.query(
        `INSERT INTO chi_tiet_don_ban_hang (
           ma_don_ban_hang, ma_san_pham, so_luong, don_gia, thanh_tien, so_luong_giao, trang_thai
         ) VALUES ($1, 1, 600, 450000, 270000000, 0, 'chua_giao')`,
        [fixtureOrder]
      );

      const insDeliveryRes = await db.query(
        `INSERT INTO giao_hang (
           ma_giao_hang, ma_don_ban_hang, ma_kho, ngay_giao,
           ten_nguoi_nhan, dia_chi_giao, trang_thai
         ) VALUES ('GH-TEST-OVERSTOCK', $1, 2, NOW(), 'Test Receiver', 'Hà Nội', 'cho_giao')
         RETURNING id`,
        [fixtureOrder]
      );
      fixtureDelivery = insDeliveryRes.rows[0].id;

      // Attempt dispatch of 600 units when only 500 are in stock
      const overstockRes = await apiCall(baseUrl, 'POST', `/api/v1/sales/giao-hang/${fixtureDelivery}/complete`, {
        token: TOKENS.kho,
        body: {},
      });

      assert.strictEqual(overstockRes.status, 409, 'Overstock dispatch must return HTTP 409');
      assert.strictEqual(
        overstockRes.body?.errorCode,
        'INSUFFICIENT_STOCK',
        'Error code must be INSUFFICIENT_STOCK'
      );
      recordPass(
        'TEST 13: Insufficient stock -> 409 INSUFFICIENT_STOCK',
        `HTTP ${overstockRes.status}, errorCode = ${overstockRes.body?.errorCode}`
      );
    } catch (err) {
      recordFail('TEST 13: Insufficient stock -> 409 INSUFFICIENT_STOCK', err);
    } finally {
      // Clean up temporary fixture
      if (fixtureDelivery) {
        await db.query('DELETE FROM giao_hang WHERE id = $1', [fixtureDelivery]);
      }
      if (fixtureOrder) {
        await db.query('DELETE FROM chi_tiet_don_ban_hang WHERE ma_don_ban_hang = $1', [fixtureOrder]);
        await db.query('DELETE FROM don_ban_hang WHERE id = $1', [fixtureOrder]);
      }
    }

    // -------------------------------------------------------------------------
    // TEST 14: No negative stock
    // -------------------------------------------------------------------------
    try {
      const stockCheck = await db.query(
        `SELECT so_luong_ton FROM ton_kho WHERE ma_kho = 2 AND ma_vat_tu = 8`
      );
      const balance = parseFloat(stockCheck.rows[0].so_luong_ton);
      assert(balance >= 0, 'Inventory balance must never drop below 0');
      assert.strictEqual(balance, 500, 'Inventory balance remains exactly 500');
      recordPass('TEST 14: No negative stock', `so_luong_ton = ${balance} >= 0`);
    } catch (err) {
      recordFail('TEST 14: No negative stock', err);
    }

    // -------------------------------------------------------------------------
    // TEST 15: RBAC ban_hang forbidden
    // -------------------------------------------------------------------------
    try {
      const rbacRes = await apiCall(baseUrl, 'POST', '/api/v1/sales/giao-hang/1/complete', {
        token: TOKENS.ban_hang,
        body: {},
      });
      assert.strictEqual(rbacRes.status, 403, 'ban_hang role must receive HTTP 403 Forbidden');
      assert(['FORBIDDEN', 'AUTH_FORBIDDEN'].includes(rbacRes.body?.errorCode), `Error code must be FORBIDDEN (Got: ${rbacRes.body?.errorCode})`);
      recordPass('TEST 15: RBAC ban_hang forbidden', `HTTP 403 ${rbacRes.body?.errorCode} verified for ban_hang`);
    } catch (err) {
      recordFail('TEST 15: RBAC ban_hang forbidden', err);
    }

    // -------------------------------------------------------------------------
    // TEST 16: Concurrent fulfillment -> chỉ một request thành công
    // -------------------------------------------------------------------------
    let concOrder = null;
    let concDelivery = null;
    try {
      // Create a disposable order and delivery for 50 units (available stock: 500)
      const concOrderRes = await db.query(
        `INSERT INTO don_ban_hang (
           ma_don_ban, ma_khach_hang, ngay_dat_hang, ngay_giao_hang_yc,
           dia_chi_giao_hang, tong_tien_hang, tong_thanh_toan, trang_thai
         ) VALUES ('DBH-CONC-TEST', 1, NOW(), NOW(), 'Hà Nội', 22500000, 22500000, 'da_xac_nhan')
         RETURNING id`
      );
      concOrder = concOrderRes.rows[0].id;

      await db.query(
        `INSERT INTO chi_tiet_don_ban_hang (
           ma_don_ban_hang, ma_san_pham, so_luong, don_gia, thanh_tien, so_luong_giao, trang_thai
         ) VALUES ($1, 1, 50, 450000, 22500000, 0, 'chua_giao')`,
        [concOrder]
      );

      const concDeliveryRes = await db.query(
        `INSERT INTO giao_hang (
           ma_giao_hang, ma_don_ban_hang, ma_kho, ngay_giao,
           ten_nguoi_nhan, dia_chi_giao, trang_thai
         ) VALUES ('GH-CONC-TEST', $1, 2, NOW(), 'Concurrent Tester', 'Hà Nội', 'cho_giao')
         RETURNING id`,
        [concOrder]
      );
      concDelivery = concDeliveryRes.rows[0].id;

      // Dispatch 2 requests concurrently against the exact same delivery ID
      const [res1, res2] = await Promise.all([
        apiCall(baseUrl, 'POST', `/api/v1/sales/giao-hang/${concDelivery}/complete`, {
          token: TOKENS.kho,
          body: {},
        }),
        apiCall(baseUrl, 'POST', `/api/v1/sales/giao-hang/${concDelivery}/complete`, {
          token: TOKENS.kho,
          body: {},
        }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      assert.deepStrictEqual(
        statuses,
        [200, 409],
        `Concurrent requests must yield exactly one 200 and one 409 (Got: ${res1.status}, ${res2.status})`
      );

      const conflictRes = res1.status === 409 ? res1 : res2;
      assert.strictEqual(
        conflictRes.body?.errorCode,
        'DELIVERY_ALREADY_DISPATCHED',
        'Conflicting request must report DELIVERY_ALREADY_DISPATCHED'
      );
      recordPass(
        'TEST 16: Concurrent fulfillment -> chỉ một request thành công',
        `Results: [${res1.status}, ${res2.status}] -> Exactly 1 success (200), 1 conflict (409)`
      );
    } catch (err) {
      recordFail('TEST 16: Concurrent fulfillment -> chỉ một request thành công', err);
    } finally {
      // Revert the 50 units deducted during concurrency test to preserve baseline stock at 500
      if (concDelivery) {
        await db.query(`
          DELETE FROM chi_tiet_phieu_xuat WHERE ma_phieu_xuat_kho IN (
            SELECT id FROM phieu_xuat_kho WHERE ma_don_ban_hang = $1
          )
        `, [concOrder]);
        await db.query('DELETE FROM phieu_xuat_kho WHERE ma_don_ban_hang = $1', [concOrder]);
        await db.query('DELETE FROM giao_hang WHERE id = $1', [concDelivery]);
      }
      if (concOrder) {
        await db.query('DELETE FROM chi_tiet_don_ban_hang WHERE ma_don_ban_hang = $1', [concOrder]);
        await db.query('DELETE FROM don_ban_hang WHERE id = $1', [concOrder]);
      }
      // Re-verify stock is 500
      await db.query('UPDATE ton_kho SET so_luong_ton = 500, gia_tri_ton_kho = 110000000 WHERE ma_kho = 2 AND ma_vat_tu = 8');
    }

    // -------------------------------------------------------------------------
    // TEST 17: Rollback test -> không để lại issue/stock/delivery partial state
    // -------------------------------------------------------------------------
    let rollOrder = null;
    let rollDelivery = null;
    try {
      const rollOrderRes = await db.query(
        `INSERT INTO don_ban_hang (
           ma_don_ban, ma_khach_hang, ngay_dat_hang, ngay_giao_hang_yc,
           dia_chi_giao_hang, tong_tien_hang, tong_thanh_toan, trang_thai
         ) VALUES ('DBH-ROLL-TEST', 1, NOW(), NOW(), 'Hà Nội', 450000, 450000, 'da_xac_nhan')
         RETURNING id`
      );
      rollOrder = rollOrderRes.rows[0].id;

      // Add line with a product ID that does not map to any material in vat_tu
      // (Temporary product with code UNMAPPED_PRODUCT_99)
      const fakeProdRes = await db.query(
        `INSERT INTO san_pham (
           ma_san_pham, ten_san_pham, gia_ban, gia_von, size, mau_sac, ma_don_vi_tinh, trang_thai
         ) VALUES ('SP-UNMAPPED-99', 'Fake unmapped garment', 450000, 200000, 'L', 'Trắng', 1, 'hoat_dong')
         RETURNING id`
      );
      const fakeProdId = fakeProdRes.rows[0].id;

      await db.query(
        `INSERT INTO chi_tiet_don_ban_hang (
           ma_don_ban_hang, ma_san_pham, so_luong, don_gia, thanh_tien, so_luong_giao, trang_thai
         ) VALUES ($1, $2, 1, 450000, 450000, 0, 'chua_giao')`,
        [rollOrder, fakeProdId]
      );

      const rollDeliveryRes = await db.query(
        `INSERT INTO giao_hang (
           ma_giao_hang, ma_don_ban_hang, ma_kho, ngay_giao,
           ten_nguoi_nhan, dia_chi_giao, trang_thai
         ) VALUES ('GH-ROLL-TEST', $1, 2, NOW(), 'Rollback Tester', 'Hà Nội', 'cho_giao')
         RETURNING id`,
        [rollOrder]
      );
      rollDelivery = rollDeliveryRes.rows[0].id;

      // Stock before attempt
      const stockBeforeRoll = parseFloat(
        (await db.query('SELECT so_luong_ton FROM ton_kho WHERE ma_kho = 2 AND ma_vat_tu = 8')).rows[0].so_luong_ton
      );

      // Attempt dispatch which must fail at resolution step (422 FINISHED_GOODS_NOT_MAPPED)
      let caughtError = null;
      try {
        await dispatchFulfillmentDelivery(rollDelivery, 1);
      } catch (err) {
        caughtError = err;
      }

      assert(caughtError, 'dispatchFulfillmentDelivery must reject with error');
      assert.strictEqual(
        caughtError.errorCode,
        'FINISHED_GOODS_NOT_MAPPED',
        'Expected FINISHED_GOODS_NOT_MAPPED'
      );

      // Verify ZERO database mutations occurred
      const pxkCount = await db.query(
        'SELECT COUNT(*) FROM phieu_xuat_kho WHERE ma_don_ban_hang = $1',
        [rollOrder]
      );
      assert.strictEqual(parseInt(pxkCount.rows[0].count, 10), 0, 'No phieu_xuat_kho must be left over');

      const deliveryState = await db.query('SELECT trang_thai FROM giao_hang WHERE id = $1', [rollDelivery]);
      assert.strictEqual(deliveryState.rows[0].trang_thai, 'cho_giao', 'Delivery status must remain cho_giao');

      const stockAfterRoll = parseFloat(
        (await db.query('SELECT so_luong_ton FROM ton_kho WHERE ma_kho = 2 AND ma_vat_tu = 8')).rows[0].so_luong_ton
      );
      assert.strictEqual(stockAfterRoll, stockBeforeRoll, 'Stock balance must remain unchanged');

      recordPass(
        'TEST 17: Rollback test -> không để lại issue/stock/delivery partial state',
        `Rollback confirmed: 0 tickets, stock unchanged (${stockAfterRoll}), delivery remained cho_giao`
      );

      // Clean up fake product
      await db.query('DELETE FROM chi_tiet_don_ban_hang WHERE ma_don_ban_hang = $1', [rollOrder]);
      await db.query('DELETE FROM san_pham WHERE id = $1', [fakeProdId]);
    } catch (err) {
      recordFail('TEST 17: Rollback test -> không để lại issue/stock/delivery partial state', err);
    } finally {
      if (rollDelivery) {
        await db.query('DELETE FROM giao_hang WHERE id = $1', [rollDelivery]);
      }
      if (rollOrder) {
        await db.query('DELETE FROM don_ban_hang WHERE id = $1', [rollOrder]);
      }
    }

    console.log('\n================================================================');
    console.log(`KẾT QUẢ TEST PH1 -> PH4 FULFILLMENT: ${passed} PASS / ${failed} FAIL (TỔNG: ${passed + failed} TESTS)`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

runFulfillmentSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
